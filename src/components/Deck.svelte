<script>
	import { getContext, onMount } from "svelte";
	import { range, sort, easeCubic, scaleLinear } from "d3";

	import filterLocation from '$actions/filterAddresses.js'
	import colorSort from "$actions/colorSort.js";
	import courtData from "$data/data.csv";//"$data/court_data.csv"
	import {Deck, OrthographicView, COORDINATE_SYSTEM, LinearInterpolator} from '@deck.gl/core';
	import {IconLayer, BitmapLayer, TextLayer} from '@deck.gl/layers';
	import {TileLayer} from '@deck.gl/geo-layers';
	import { fade } from 'svelte/transition';
	import {ClipExtension} from '@deck.gl/extensions';

	import {
		readAll,
		countRows,
		addRow
	} from "$utils/supabase.js";



	import MapboxGeocoder from '@mapbox/mapbox-gl-geocoder';
	import '@mapbox/mapbox-gl-geocoder/dist/mapbox-gl-geocoder.css';

	import {load, setLoaderOptions, registerLoaders} from '@loaders.gl/core';
	
	export let viewportHeight;
	export let viewportWidth;

	import {
		BasisLoader,
	} from '@loaders.gl/textures';

	function shuffle(a) {
		var j, x, i;
		for (i = a.length - 1; i > 0; i--) {
			j = Math.floor(Math.random() * (i + 1));
			x = a[i];
			a[i] = a[j];
			a[j] = x;
		}
		return a;
	}

	const favesMapping = {
		"marker": {
			"x": 0,
			"y": 0,
			"width": 128,
			"height": 128,
			"anchorY": 64,
			"mask": true
		},
		"marker-warning": {
			"x": 128,
			"y": 0,
			"width": 128,
			"height": 128,
			"anchorY": 64,
			"mask": false
		}
	}

	let el;
	let zoom = 3;
	let deckgl;
	let bounds;
	let inputBox;
	let spritePositionsMaster;
	// $: bounds ? renderLayers() : null;

	let width = 64;//2304;//128;
	let height = 64;//2176;//128;
	let spriteMap = {};

	let states = [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14];
	let layerProps = [];
	let layers = [];
	let bitmapSublayers = [];
	let renderedSublayers = [];

	$: console.log(zoom)

	// $: console.log(screenCoordinates)

	function makeMasterData(toFilter,data){
		let spritePositionsMaster;

		if(toFilter.length > 0){
			spritePositionsMaster = data.filter(d => {
				return toFilter.indexOf(d.id) > -1;
			})
		}
		else {
			spritePositionsMaster = data.map(d => d);
		}

		let squareSize = Math.floor(Math.sqrt(spritePositionsMaster.length));
		spritePositionsMaster = spritePositionsMaster.map((d,i) => {
			let x = (i % squareSize) * 5 + (i % squareSize)*.1// + Math.random()*1;
			let y = Math.floor(i/squareSize) * 5 + Math.floor(i/squareSize)*1*.1// + Math.random() * 1;
			return {"coordinates":[x,y], id:d.id.replace(".jpg",""),location:d.location, state:d.state, geo:d.geo,squareSize:squareSize};
		});

		return spritePositionsMaster;
	}

	async function makeSpriteObject(){
		let test = {};

		for (let state of states){
			let spriteMap = courtData.map(d => {
				return {geo:d.geo, x:+d.x, y:+d.y, width:width, height: height, mask: false, id:d.id.replace(".jpg","").replace(".jpeg","")};
			}).filter(d => {
				return d.geo == state;
			})

			const spriteObject = {};

			for (let row of spriteMap) {
				spriteObject[row.id] = row;
			}
			test[state] = spriteObject
		}
		return test;
	}

	function preloadBasisLoader() {
		return new Promise(async (resolve, reject) => {
	  		const dummyBasisFile = 'assets/load.basis';  // Path to a small BASIS file
  			await load(dummyBasisFile).then(() => {
				console.log('BasisLoader preloaded');
				resolve();
			})
		})
	}

	function getTexture(state){
		return new Promise(async (resolve, reject) => {

			let options = {
				'basis': {
					format: "etc1",//"astc-4x4",
					'CDN':false,
					'useLocalLibraries':true,
					'workerUrl':"libs-2/basis-worker.js"//["libs/basis_encoder.js","libs/basis_encoder.wasm","libs/basis_encoder.wasm"]
				},
				'compressed-texture': {
					useBasis: true,
					'CDN':false,
					'useLocalLibraries':true
				},
				'CDN':false,
				'useLocalLibraries':true
			}

			await load(`assets/${state}.basis`).then((result) => {
				console.log("basis loaded ",state)
				const image = result[0]//.filter((d,i) => i < 1);
				let texture = {
					data: image,
					width: 4096,
					height: 4096,
					compressed: true,
				}

				layerProps[state].iconAtlas = texture;
				resolve();
			});

		})

	}

	async function makeIconLayersProps(){
		for (let state of states){
			let props = {
				id: `IconLayer_${state}`,
				getIcon: d => d.id,
				getPosition: d => d.coordinates,
				getSize: 5,
				// onHover: (info, event) => console.log('Hover:', info, event),
				// onClick: (info, event) => console.log('Clicked:', info, event),
				// pickable: true,
				sizeUnits: 'common',
				iconMapping: spriteMap[state],
				transitions: {
					getPosition: {
						duration: 1000,
					}
				}
			};
			layerProps.push(props);
		}

		await preloadBasisLoader()//.then(async() => {
		await Promise.all(states.map(async d => {
			await getTexture(d);
        }))
		return true;
	}
	
	async function assignDataToIconLayers(){
		for (let layer in layerProps){
			let dataTobind = spritePositionsMaster.filter(d => d.geo == states[layer]);
			layerProps[layer].data = dataTobind;
		}
		return true;
	}

	let tilesLoaded = [];
	
	async function makeTileLayer(){

		let tileLayer = new TileLayer({
			tileSize: 256,
			coordinateSystem: COORDINATE_SYSTEM.CARTESIAN,
			onViewportLoad: layers => {
				// console.log(layers,"hi")
				renderedSublayers= Array.from(layers
					.flatMap(obj => obj.content ? obj.content : [])
					.reduce((map, item) => {
						if (!map.has(+item.id)) {
							map.set(+item.id, item);
						}
						return map;
					}, new Map())
					.values())
					;
    		},

			// onClick: ((info, event) => {
			// 					console.log(info)
			// 				}),

			// pickable:true,
			getTileData: async ({id, bbox}) => {
				if(zoom < 5){
					return null;
				}
				return getData(bbox, id);
			},
			renderSubLayers: props => {

				const {
					bbox: {left, bottom, right, top}
				} = props.tile;

				let layers = [
				]

				if(props.data && props.data.length > 0){
					// console.log("rendering sublayers",props);

					
					
					for (let image in props.data){
						// console.log(props)
						props.data[image].tileId = props.id;
						// renderedSublayers.push(props.data[image]);
						let imageId = props.data[image].id;
						let imageCoors = props.data[image].coordinates;
						let imageName = `${props.data[image].location}, ${props.data[image].state}`;

						// let imageCoorsFinal = [imageCoors[0],imageCoors[1],imageCoors[0],imageCoors[1]];
						let imageCoorsFinal = [
							imageCoors[0]-2.5, //min x left
							imageCoors[1]+5-2.5, //max y bottom
							imageCoors[0]+5-2.5, // max x right
							imageCoors[1]-2.5 //min y top
						];

						let left = imageCoors[0]-2.5;
						let bottom = imageCoors[1]+5-2.5;
						let right = imageCoors[0]+5-2.5;
						let top = imageCoors[1]+2;

						//Coordinates of the bounding box of the bitmap [left, bottom, right, top]
						//Coordinates of four corners of the bitmap, should follow the sequence of 
						//[[left, bottom], [left, top], [right, top], [right, bottom]]. 


						let imgType = "jpg";
						// if(zoom > 6){
						// 	imgType = "png";
						// }



						const item = new BitmapLayer(props,{
							image: `https://s3.amazonaws.com/pudding.cool/projects/courts/${imgType}/${imageId}.${imgType}`,
							id: `${props.id}_${imageId}_bitmap`,
							bounds: imageCoorsFinal,//[0,5,5,0]
							visible: zoom > 5,
							// extensions: [new ClipExtension()],
							// clipBounds: [left, bottom, right, top]
							// pickable: false,
							// onClick: (info, event) => console.log('Clicked:', info, event),
						})

						const itemTwo = new BitmapLayer(props,{
							image: `assets/toolbar.jpg`,
							id: `${props.id}_${imageId}_bitmap2`,
							bounds: [[left, bottom], [left, top], [right, top], [right, bottom]],//[0,5,5,0]
						})

						const TEXT_DATA = [
							{
								text: imageName,
								position: [imageCoorsFinal[0]+.1, imageCoorsFinal[1]-.2],
								color: [255, 255, 255],
								size:.2
							},
							{
								text: "1",
								position: [imageCoorsFinal[0]+5-.3, imageCoorsFinal[1]-.2],
								color: [255, 255, 255],
								size: .2
							}
						];

						const textLayer = new TextLayer(props, {
							data: TEXT_DATA,
							id: `TextLayer-${imageId}-${props.id}`,
							getPosition: d => d.position,
							getText: d => d.text,
							characterSet: 'auto',
							getAlignmentBaseline: 'center',
							getColor: [255, 255, 255],
							getSize: .3,
							background: true,
							getBackgroundColor: [0,0,0],
							getTextAnchor: 'start',
							sizeUnits: 'common',
						});

						const ICON_DATA = [
							{
								position: [imageCoorsFinal[0]+5-.5, imageCoorsFinal[1]-.5],
								color: [255, 0, 0],
							}
						];

						const iconLayerFave = new IconLayer(props, {
							data: ICON_DATA,
							coordinateSystem: COORDINATE_SYSTEM.CARTESIAN,
							id: `iconLayer-${imageId}-${props.id}`,
							getPosition: d => d.position,
							iconAtlas: 'assets/heart.png',
							iconMapping: favesMapping,
							getSize: .5,
							getIcon: d => 'marker-warning',
							// getColor: [255, 0, 0],
							// mask: true,
							// onHover: (info, event) => console.log('Hover:', info, event),
							// onClick: (info, event) => console.log('Clicked:', info, event),
							// alphaCutoff: 0,
							// autoHighlight: true,
							// autoHighlight: true,
							sizeUnits: 'common',
						});

						layers.push(item);
						layers.push(itemTwo);

						layers.push(textLayer);
						// layers.push(iconLayerFave);


					}
				}

				if(bounds){
					// let outline = new BitmapLayer(props,{
					// 	image: `assets/box.png`,
					// 	id: `${props.id}_outline`,
					// 	bounds: [bounds[0]+1,bounds[1]+1,bounds[2]-1,bounds[3]-1]
					// 	//bounds: [left,bottom,right,top]
					// })

					// layers.push(outline);
				}

				// renderedSublayers = [...renderedSublayers];

				return layers
			},
			// onClick: (info, event) => console.log('Clicked:', info, event),
			// alphaCutoff: 0,
			// autoHighlight: true,

		})
		layers.push(tileLayer)	
	}

	async function makeIconLayers(){
		layers = [];
		for (let layer in layerProps){
			let iconLayer = new IconLayer({
				...layerProps[layer]
			})
			layers.push(iconLayer)
		}
		return true;
	}






	// data = range(10000).map((d,i) => {
	// 	let x = (i % 100) * 5 + (i % 100);
	// 	let y = Math.floor(i/100) * 5 + Math.floor(i/100)*1;
	// 	return {"coordinates":[x,y], id:"new_0"}
	// })

	// data.push({"coordinates":[-88,-56], id:"new_0"})


	let highResData = [];
	let drawTimeout;

	function getScreenCoordinates(coords,viewport) {
		if(coords && viewport){
			return viewport.project([coords[0]-2.5,coords[1]-2.5]);
		}
		else {
			return [0,0];
		}
  	}


	let screenCoordinates = [];
	let mainViewport = null;
	let boxes = [];

  	function updateScreenCoordinates(viewport) {
		screenCoordinates = renderedSublayers.map(d => ({
			id:d.id,
			screenPosition: getScreenCoordinates(d.coordinates,viewport),
			screenWidth: (getScreenCoordinates([10,0],viewport)[0]-getScreenCoordinates([5,0],viewport)[0]),
			info: d
		}));

		screenCoordinates.forEach(d => {
			boxes.push([d.screenPosition[0],d.screenPosition[0]+d.screenWidth,d.screenPosition[1], d.screenPosition[1] + d.screenWidth])
		})
  	}

	async function getData(bbox, id) {
  	// Stall for 20ms - simulate an async request
  		// await new Promise(resolve => setTimeout(resolve, 100));
		if(!courtData){
			return [];
		}

		// console.log(bbox)
		const { left, right, top, bottom } = bbox;

		let highResData = [];
		for (let i = 0; i < spritePositionsMaster.length; i++) {
			const d = spritePositionsMaster[i];
			const [x, y] = d.coordinates;
			if (x >= left && x <= right && y >= top && y <= bottom) {
				highResData.push(d);
			}
		}

		return highResData
	}

	onMount(async () => {

		setLoaderOptions({
			'basis': {
					format: "etc1",//"astc-4x4",
					maxConcurrency:1,
					'CDN':false,
					worker: true,  // Enable workers globally for all loaders
					'useLocalLibraries':true,
					'workerUrl':"libs-2/basis-worker.js"//["libs/basis_encoder.js","libs/basis_encoder.wasm","libs/basis_encoder.wasm"]
				},

			worker: true,  // Enable workers globally for all loaders
		// 	'workerUrl':"libs-2/basis-worker.js",//["libs/basis_encoder.js","libs/basis_encoder.wasm","libs/basis_encoder.wasm"]
			'CDN':false,
			maxConcurrency:1,
			'useLocalLibraries':true,
			// BasisLoader: {
			// 	'basis': {
			// 		format: "etc1",//"astc-4x4",
			// 		'CDN':false,
			// 		'useLocalLibraries':true,
			// 		'workerUrl':"libs-2/basis-worker.js"//["libs/basis_encoder.js","libs/basis_encoder.wasm","libs/basis_encoder.wasm"]
			// 	},
			// 	'workerUrl':"libs-2/basis-worker.js",//["libs/basis_encoder.js","libs/basis_encoder.wasm","libs/basis_encoder.wasm"]
			// 	'CDN':false,
			// 	'useLocalLibraries':true
			// },
		});

		registerLoaders(BasisLoader);

		spritePositionsMaster = await makeMasterData([],courtData);
		console.log("sprite positions loaded")
		spriteMap = await makeSpriteObject();
		await makeIconLayersProps();
		await assignDataToIconLayers()
		await makeIconLayers();
		await makeTileLayer();

		const geocoder = new MapboxGeocoder({
			accessToken: 'pk.eyJ1IjoiZG9jazQyNDIiLCJhIjoiY2xqc2g3N2o5MHAyMDNjdGhzM2V2cmR3NiJ9.3x1ManoY4deDkAGBuUMnSw',
			types: 'region,postcode,district,place,neighborhood',
			options: {
				marker: false,
			}
		});
		geocoder.addTo(inputBox)

		geocoder.on('result', async(e) => {
    		await sortImages(e);
			rebuildGrid();
		});

		// let thing = await addRow(12312312333);

		deckgl = new Deck({
			parent: el,
			views: new OrthographicView(),
		    initialViewState: { 
				target: [100, 100, 0],
				zoom: zoom,
				transitionInterpolator: new LinearInterpolator(['zoom']),
			    transitionDuration: 'auto'
			},
			// getTooltip: ({object}) => object && {
			// 	html: `${object.name}`,
			// 	style: {
			// 	fontSize: '0.8em',
			// 	padding: '5px',
      		// 	}
    		// },
			onClick: ({x,y}) => {

				let selected = screenCoordinates.filter(d => {
					let box = [d.screenPosition[0],d.screenPosition[0]+d.screenWidth,d.screenPosition[1], d.screenPosition[1] + d.screenWidth];
					return (box[0] < x && box[1] > x) && (box[2] < y && y < box[3])
				})
		
				if(selected.length > 0){
					console.log(selected[0].info)
				}

				// Query up to 5 overlapping objects under the pointer
				// const pickInfo = deckgl.pickMultipleObjects({x, y, radius: 1, depth:5});
				// console.log(pickInfo);
			},


			// pickable: true,
			// onClick: (info, event) => console.log('Clicked:', info, event),
			onViewStateChange: ({viewState}) => {

				let width = viewportWidth;
				let height = viewportHeight;

				zoom = viewState.zoom;
				let viewport = new OrthographicView().makeViewport({width,height,viewState});

				// const view = new OrthographicView(viewState.main);
				// let viewportTwo = view.makeViewport({width, height, viewState})


				updateScreenCoordinates(viewport);


				// bitmapSublayers = [];

				// const collectTileUrls = (layer) => {
				// 	if (layer.props.data && layer.constructor.name == "_BitmapLayer") {
				// 		// console.log(layer.props.data, layer.constructor.name)
				// 		bitmapSublayers.push(layer.props.data[0]);
				// 		if (layer.props.layers) {
              	// 			layer.props.layers.forEach(collectTileUrls);
			    //         }
				// 	}		
				// };

				// // Collect tile URLs
				// deckgl.layerManager.getLayers().forEach(collectTileUrls);

				// // Collect BitmapLayer sublayers
				// deckgl.layerManager.getLayers().forEach(collectBitmapSublayers);

				// console.log('Bitmap Sublayers:', bitmapSublayers);

				// deckgl.layerManager.getLayers()[1]
				// console.log(zoom)
				// let width = viewportWidth;
				// let height = viewportHeight;
				// const view = new OrthographicView(viewState.main);
				// let viewport = view.makeViewport({width, height, viewState})
				// bounds = viewport.getBounds();
				// zoom = viewport.zoom;
				// console.log(zoom,bounds)
  			},
			controller: true,
			// getTooltip: ({object}) => showObject(object),
			layers: layers
		});

	})

	function zoomTo(zoomLevel){
		return new Promise((resolve, reject) => {
			const interpolator = new LinearInterpolator(['zoom']);

			deckgl.setProps({
				views: new OrthographicView(),
				initialViewState: {
					// ...deckgl.viewState,
					target: [0, 0, 0],
					zoom: zoomLevel,
					controller: true,
					transitionDuration: 1000,
					transitionInterpolator: interpolator,
					transitionEasing: easeCubic,
					onTransitionEnd: () => {
						resolve();
					}
				},
			});
		})
	}

	async function rebuildGrid(){
		// console.log(spritePositionsMaster)
		await assignDataToIconLayers()
		await makeIconLayers();
		await makeTileLayer();

		if(zoom == -1.5){
			deckgl.setProps({
				layers: layers
			});	
		}
		else {
			await zoomTo(-1.5);
			deckgl.setProps({
				layers: layers
			});
			setTimeout(()=> {
				zoomTo(2.8);
			},1000)
		}
	}


	function sortImages(locationData){
		return new Promise((resolve, reject) => {
        	let ids = filterLocation(courtData,locationData,"bbox");
			// console.log(ids)
			spritePositionsMaster = makeMasterData(ids,courtData);
			
			resolve();
		})
	}


	async function sortColor(){
		let newData = colorSort(courtData);
		spritePositionsMaster = await makeMasterData([],newData);

		await assignDataToIconLayers()
		await makeIconLayers();
		await makeTileLayer();

		deckgl.setProps({
			layers: layers
		});
	}

	// function viewLayer(layer){
	// 	console.log(layer)
	// 	return "hi";
	// }

	function handleDragStart(event) {
    	event.stopPropagation();
		event.preventDefault();
  	}


</script>
<!-- <svelte:component this={autofill} /> -->
<div class="overlay" id="overlay">
	<div bind:this={inputBox} id="geocoder" class="geocoder">
	</div>
	<h1>{renderedSublayers.length}</h1>
	
	{#each screenCoordinates as layer (layer.info.id) }
		<div
			style="
				position:absolute;
				margin:0;
				top:0;
				pointer-events:none;
				width:{layer.screenWidth}px;
				height:{layer.screenWidth}px;
				left:0;
				font-size:24px;
				transform: translate({layer.screenPosition[0]}px,{layer.screenPosition[1]}px);
			"
			class="overlay-test"
		>
			<div class="faves"
				on:mousedown={handleDragStart}
				on:touchstart={handleDragStart}		 
				on:click={() => console.log("click")}
				draggable="true"
				style="
					width:100%;
					background: red;
					height:20%;
				"
			>
			</div>
		</div>
	{/each}

	<!-- <button on:click={() => sortColor(courtData)}>sort</button> -->
</div>

<div class="el" bind:this={el}>
</div>

<style>
	
	.overlay {
		position: fixed;
		top: 0;
		left: 0;
        z-index: 1000;
	}

	.overlay-test {
		pointer-events: none;
		display: none;
	}

	.faves {
		position: absolute;
		bottom: 0;
		right: 0;
		background-color: black;
		pointer-events: auto;
	}

	.faves svg {
		width: 100%;
	}

    .el {
		/* background-color: white; */
        width: 100%;
		height: 100%;
		position: absolute;
		top: 0;
		left: 0;
    }
</style>
