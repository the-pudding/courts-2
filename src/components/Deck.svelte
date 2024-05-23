<script>
	import { getContext, onMount } from "svelte";
	import { range, sort, easeCubic } from "d3";
	import filterLocation from '$actions/filterAddresses.js'
	import colorSort from "$actions/colorSort.js";
	import courtData from "$data/data.csv";//"$data/court_data.csv"
	import {Deck, OrthographicView, COORDINATE_SYSTEM, LinearInterpolator} from '@deck.gl/core';
	import {IconLayer, BitmapLayer, TextLayer} from '@deck.gl/layers';
	import {TileLayer} from '@deck.gl/geo-layers';

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
			return {"coordinates":[x,y], id:d.id.replace(".jpg",""), "geo": d.geo,squareSize:squareSize};
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
				onClick: (info, event) => console.log('Clicked:', info, event),
				pickable: true,
				//iconAtlas: `assets/spritesheet_128_${state}.jpeg`,
				iconMapping: spriteMap[state],
				sizeUnits: 'common',
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

	async function makeTileLayer(){

		let tileLayer = new TileLayer({
			tileSize: 256,
			coordinateSystem: COORDINATE_SYSTEM.CARTESIAN,
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

				console.log(left,top)

				if(props.data && props.data.length > 0){


					
					for (let image in props.data){

						let imageId = props.data[image].id;
						let imageCoors = props.data[image].coordinates;
						
						// let imageCoorsFinal = [imageCoors[0],imageCoors[1],imageCoors[0],imageCoors[1]];
						let imageCoorsFinal = [imageCoors[0]-2.5,imageCoors[1]+5-2.5,imageCoors[0]+5-2.5,imageCoors[1]-2.5];

						let imgType = "jpg";
						// if(zoom > 6){
						// 	imgType = "png";
						// }

						const item = new BitmapLayer(props,{
							image: `https://s3.amazonaws.com/pudding.cool/projects/courts/${imgType}/${imageId}.${imgType}`,
							id: `${props.id}_${imageId}_bitmap`,
							bounds: imageCoorsFinal,//[0,5,5,0]
							visible: zoom > 5,
							pickable: false,
						})

						layers.push(item);

						const TEXT_DATA = [
							{
								text: 'Hello',
								position: [imageCoorsFinal[0], imageCoorsFinal[1]],
								color: [255, 0, 0]
							}
						];

						const textLayer = new TextLayer(props, {
							data: TEXT_DATA,
							id: `TextLayer-${imageId}-${props.id}`,
							getPosition: d => d.position,
							getText: d => d.text,
							getAlignmentBaseline: 'center',
							getColor: [255, 0, 0],
							getSize: 12,
							getTextAnchor: 'middle',
						});

						layers.push(textLayer);

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

				return layers
			}
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

	function showObject(object){
		console.log(object);
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

		// layers = [];


		const geocoder = new MapboxGeocoder({
			accessToken: 'pk.eyJ1IjoiZG9jazQyNDIiLCJhIjoiY2xqc2g3N2o5MHAyMDNjdGhzM2V2cmR3NiJ9.3x1ManoY4deDkAGBuUMnSw',
			types: 'region,postcode,district,place,neighborhood',
			options: {
				marker: false,
			}
		});
		geocoder.addTo(inputBox)
		// console.log(inputBox)

		// inputBox.appendChild("#geocoder");

		geocoder.on('result', async(e) => {
    		await sortImages(e);
			rebuildGrid();
		});

		deckgl = new Deck({
			parent: el,
			views: new OrthographicView(),
		    initialViewState: { 
				target: [100, 100, 0],
				zoom: zoom,
				transitionInterpolator: new LinearInterpolator(['zoom']),
			    transitionDuration: 'auto'
			},
			onViewStateChange: ({viewState}) => {
				zoom = viewState.zoom;
				console.log(zoom)
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
		console.log(spritePositionsMaster)
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
			console.log(ids)
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

</script>
<!-- <svelte:component this={autofill} /> -->

<div class="overlay">
	<div bind:this={inputBox} id="geocoder" class="geocoder">
	</div>
	<button on:click={() => sortColor(courtData)}>sort</button>
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

    .el {
		/* background-color: white; */
        width: 100%;
		height: 100%;
		position: absolute;
		top: 0;
		left: 0;
    }
</style>
