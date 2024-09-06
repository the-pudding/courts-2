<script>
	import { onMount } from "svelte";
	import { easeCubic, index, format } from "d3";
	import filterLocation from '$actions/filterAddresses.js'
	import filterColor from '$actions/filterColors.js';
	import colorSort from "$actions/colorSort.js";
	import courtData from "$data/data.csv";
	import {Deck, OrthographicView, OrthographicViewport, COORDINATE_SYSTEM, LinearInterpolator} from '@deck.gl/core';
	import {IconLayer, BitmapLayer, TextLayer} from '@deck.gl/layers';
	import {TileLayer} from '@deck.gl/geo-layers';
	import { fly } from 'svelte/transition';
	import WorldMap from "$components/WorldMap.svelte";
    import { tweened } from "svelte/motion";
	import calcSquareSize from "$actions/getMaxSizeSquare.js"
	import calcSquareSizeFiltered from "$actions/getMaxSizeSquareFiltered.js"
	import Mark from "$svg/mark.svg";



	import ThreeD from "$components/ThreeD.svelte"
	
	import Comment from "$components/Comment.svelte"

	import {
		isCommenting, isThreeD
	} from "$stores/misc.js";

	import {
		countFaves,
		addRow,
		addComment
	} from "$utils/supabase.js";

	import MapboxGeocoder from '@mapbox/mapbox-gl-geocoder';
	import '@mapbox/mapbox-gl-geocoder/dist/mapbox-gl-geocoder.css';

	import {load, setLoaderOptions, registerLoaders} from '@loaders.gl/core';
	
	export let viewportHeight;
	export let viewportWidth;

	import {
		BasisLoader,
		selectSupportedBasisFormat
	} from '@loaders.gl/textures';

	
	$: console.log(zoom)

	let skipIntro = false;
	let showEl = false;
	let sizesFiltered;

	let swatchSet = null;

	let colors = [
		"rgb(45, 181, 77)",
		"rgb(66, 102, 235)",
		"rgb(96, 216, 230)",
		"rgb(168, 59, 157)",
		"rgb(207, 21, 24)",
		"rgb(225, 108, 51)",
		"rgb(227, 198, 36)",
		"rgb(235, 122, 184)"
	]

	let formatComma = format(",");
	let screenCoordinates = [];
	let el;
	let zoom = 0;
	let tileLayerZoom = 3.9;
	let targetDeck;
	let deckgl;
	let dummy;
	let favoritedCourt;
	let bounds;
	let inputBox;
	let sizes;
	let spritePositionsMaster;
	let commentId;
	let commentNode;
	let filteredIds = [];
	let threeDId;
	let mounted = false;
	let deckAdded;
	let threeDNode;
	let texturesLoaded;
	let favoriteActive = false;

	let width = 64;//2304;//128;
	let height = 64;//2176;//128;
	let spriteMap = {};
	let supaBaseData;
	let geoCoderAdded;
	let states = [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14];
	let layerProps = [];
	let layers = [];
	let bitmapSublayers = [];
	let renderedSublayers = [];
	let geoJSON;

	let courtsWithFavorites = {}
	let courtsWithComments = {};

	let courtsFaveCount = [0];

	function makeMasterData(toFilter,data){

		let courtFaves = Object.keys(courtsWithFavorites);
		let courtComments = Object.keys(courtsWithComments);

		let spritePositionsMaster;

		if(toFilter.length > 0){
			spritePositionsMaster = data.filter(d => {
				return toFilter.indexOf(d.id) > -1;
			})
		}
		else {
			spritePositionsMaster = data.map(d => d);
		}

		sizesFiltered = calcSquareSizeFiltered(viewportWidth,viewportHeight,spritePositionsMaster.length,10);

		let squareSize = sizesFiltered.rowSize;

		spritePositionsMaster = spritePositionsMaster.map((d,i) => {

			let faves = 0;
			let comments = 0;
			let id = d.id.replace(".jpg","");
			let supa = supaBaseData.has(+id) ? supaBaseData.get(+id) : null;

			if(supa){
				console.log(supa)
				faves = supa.count ? supa.count : 0;
				comments = supa.comment_count ? supa.comment_count : 0;
			}


			if(courtFaves.indexOf(id) > -1){
				faves = faves + courtsWithFavorites[id];
			}
			if(courtComments.indexOf(id) > -1){
				comments = comments + courtsWithComments[id];
			}

			let x = (i % squareSize) * sizes.size + (i % squareSize)*.1// + Math.random()*1;
			let y = Math.floor(i/squareSize) * sizes.size + Math.floor(i/squareSize)*.1// + Math.random() * 1;

			return {
				"coordinates":[x,y],
				id:id,
				color:d.color,
				court_count: i,
				latLong: d.center.split(",").map(d => +d),
				location:d.location,
				state:d.state,
				geo:d.geo,
				squareSize:squareSize,
				likes:faves,
				comments:comments
			};
		});

		if(sortValue){
			spritePositionsMaster = spritePositionsMaster.sort((a,b) => {
				if(sortValue == "heart"){
					return b.likes - a.likes;
				}
				if(sortValue == "comment"){
					return b.comments - a.comments;
				}
				
			})

			spritePositionsMaster.forEach((d,i) => {
				let x = (i % squareSize) * sizes.size + (i % squareSize)*.1// + Math.random()*1;
				let y = Math.floor(i/squareSize) * sizes.size + Math.floor(i/squareSize)*.1// + Math.random() * 1;

				d.coordinates = [x,y];
			})

			console.log(spritePositionsMaster.slice(0,10))
		}
		

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
    
	let fetchedChunks = 0;
	let totalChunks = states.length-1;
	let firstTileLayer;
	let iconAtlasLayer;
	let textLayer;
	
	let chunk;

	

	async function loadTestIconAtlas(){
		let iconMapping = {
			"marker": {
				width: 1500,
				height: 1510,
				x:0,
				y:0,
				mask:false
			}
		};

		let props = {
			id: `IconLayer_test`,
			getIcon: d => "marker",
			data: spritePositionsMaster,
			getPosition: d => d.coordinates,
			getSize: sizes.size,
			sizeUnits: 'common',
			iconMapping: iconMapping,
			iconAtlas:`assets/toolbar-3.png`,
			transitions: {
				getPosition: {
					duration: 500,
				}
			}
		};

		iconAtlasLayer = new IconLayer({
			...props
		})

		// layers.push(iconLayer)

	}

	async function makeTextData() {

		let textData = [];

		for (let item of spritePositionsMaster){

			let likes = JSON.stringify(item.likes);
			let comments = JSON.stringify(item.comments);

			textData.push({
				text: `${item.location}, ${item.state}`,
				position: [item.coordinates[0]-(.48*sizes.size), item.coordinates[1]+(.44*sizes.size)],
				size:(.08*sizes.size)
			})

			textData.push({
				text: likes,
				position: [item.coordinates[0]+(.41*sizes.size), item.coordinates[1]+(.438*sizes.size)],
				size:(.066*sizes.size)
			})

			textData.push({
				text: comments,
				position: [item.coordinates[0]+(.41*sizes.size), item.coordinates[1]+(.314*sizes.size)],
				size:(.066*sizes.size)
			})
		}

		return textData;
	}

	async function loadText(){

		let textData = await makeTextData();

		textLayer = new TextLayer({
			data: textData,
			id: `TextLayer-test`,
			getPosition: d => d.position,
			getText: d => {
				return d.text;
			},
			// fontSettings: {
			// 	sdf:true
			// },
			maxWidth: 10,
			// outlineWidth: 15,
			// background: true,
			// backgroundColor: [0,0,0],
			// outlineColor: [0,0,0],
			getAlignmentBaseline: 'top',
			fontFamily: "-apple-system,BlinkMacSystemFont,Helvetica,Arial,sans-serif",
			getAlignmentBaseline: 'center',
			getColor: [255, 255, 255],
			getSize: d => d.size,
			getTextAnchor: 'start',
			sizeUnits: 'common',
			updateTriggers: {
				getText: courtsFaveCount
			}
		});

		// layers.push(textLayer)

	}

	async function loadChunks() {
      while ((chunk = await fetchNextChunk())) {
		makeIconLayers();
		deckgl.setProps({
			layers: layers
		});
      }
	  console.log("loading done")
	  
	  await makeTileLayer();
	  await loadTestIconAtlas();
	  await loadText();

	  deckgl.setProps({
	  	layers: layers.concat([firstTileLayer,iconAtlasLayer,textLayer])
	  });

	//   setTimeout(() => {
	// 	zoomTo(0);
	//   },1000)

    }

	function fetchNextChunk(){
		console.log("fetching new chunk")

		if (fetchedChunks < totalChunks) {
        	fetchedChunks++;
			

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

				console.log(fetchedChunks)

				await load(`assets/${fetchedChunks}.basis`).then((result) => {
					console.log("basis loaded ",fetchedChunks)
					const image = result[0]//.filter((d,i) => i < 1);
					let texture = {
						data: image,
						width: 4096,
						height: 4096,
						compressed: true,
					}

					layerProps[fetchedChunks].iconAtlas = texture;
					resolve(true);
				});
			})
		} else {
        	return null;
      	}
	}

	async function makeIconLayersProps(){
		for (let state of states){
			let props = {
				id: `IconLayer_${state}`,
				getIcon: d => d.id,
				getPosition: d => d.coordinates,
				getSize: sizes.size,
				mask:false,
				sizeUnits: 'common',
				iconMapping: spriteMap[state],
				transitions: {
					getPosition: {
						duration: 750,
      					easing: easeCubic
					}
				}
			};
			layerProps.push(props);
		}

		await preloadBasisLoader()//.then(async() => {
		dummy = true;

		if(!skipIntro){
			countTween.set(1).then(() => {
				countTweenFinished = true;
			})
		}
		
		await Promise.all(states.slice(0,1).map(async d => {
			await getTexture(d);
        }))

		texturesLoaded = true;
		return true;
	}
	
	async function assignDataToIconLayers(){
		console.log(layerProps)

		for (let layer in layerProps){
			let dataTobind = spritePositionsMaster.filter(d => d.geo == states[layer]);
			layerProps[layer].data = dataTobind;
			// layerProps[layer].getSize = sizes.size;
		}
		return true;
	}
	let countTweenFinished;
	let tilesLoaded = [];
	
	async function makeTileLayer(){

		let tileLayer = new TileLayer({
			tileSize: 256,
			id:`tileLayer_`,
			coordinateSystem: COORDINATE_SYSTEM.CARTESIAN,
			// visible: zoom > 4.5,
			onViewportLoad: layers => {
				// console.log(layers,"hi")
				let oldLength = renderedSublayers.length;
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
				if(oldLength == 0 && renderedSublayers.length > 0){

					// deckgl.redraw();
		
					const width = viewportWidth; // Width of the viewport
					const height = viewportHeight; // Height of the viewport
					const target = [targetDeck[0], targetDeck[1], 0]; // Target point [x, y, z]

					// Calculate the bounds
					const left = -width / 2;
					const right = width / 2;
					const top = height / 2;
					const bottom = -height / 2;

					// Create the orthographic view
					const viewport = new OrthographicViewport({
						width,
						height,
						left,
						right,
						top,
						bottom,
						target,
						zoom
					});

					updateScreenCoordinates(viewport);
				}
    		},
			getTileData: async ({id, bbox,signal}) => {
				if(zoom < tileLayerZoom){
					return null;
				}
				if (signal.aborted) {
    				return null;
  				}
				return getData(bbox, id);
			},
			updateTriggers: {
				// renderSubLayers: courtsFaveCount,
				getTileData:courtsFaveCount,
				// all:courtsFaveCount,
			},
			renderSubLayers: props => {

				const {
					bbox: {left, bottom, right, top}
				} = props.tile;

				let layers = [
				]

				if(props.data && props.data.length > 0){

					for (let image in props.data){
						props.data[image].tileId = props.id;
						// let likes = JSON.stringify(props.data[image].likes);
						// let comments = JSON.stringify(props.data[image].comments);
						let imageId = props.data[image].id;
						let imageCoors = props.data[image].coordinates;
						// let imageName = `${props.data[image].location}, ${props.data[image].state}`;

						// let imageCoorsFinal = [imageCoors[0],imageCoors[1],imageCoors[0],imageCoors[1]];
						let imageCoorsFinal = [
							imageCoors[0]-(sizes.size/2), //min x left
							imageCoors[1]+(sizes.size/2), //max y bottom
							imageCoors[0]+(sizes.size/2), // max x right
							imageCoors[1]-(sizes.size/2) //min y top
						];

						// let left = imageCoors[0]-(sizes.size/2);
						// let bottom = imageCoors[1]+(sizes.size/2);
						// let right = imageCoors[0]+(sizes.size/2);
						// let top = imageCoors[1]-(sizes.size/2);
						//Coordinates of the bounding box of the bitmap [left, bottom, right, top]
						//Coordinates of four corners of the bitmap, should follow the sequence of 
						//[[left, bottom], [left, top], [right, top], [right, bottom]]. 


						let imgType = "webp"
						let imgSize = 150;
						let imgPath = `https://s3.amazonaws.com/pudding.cool/projects/courts/${imgType}/${imgSize}/${imageId}.${imgType}`
						if(zoom > 5){
							imgType = "jpg";
							imgPath = `https://s3.amazonaws.com/pudding.cool/projects/courts/${imgType}/${imageId}.${imgType}`
						}

						
						const item = new BitmapLayer(props,{
							image: imgPath,
							id: `${props.id}_${imageId}_bitmap`,
							bounds: imageCoorsFinal,//[0,5,5,0]
							visible: zoom > tileLayerZoom,
							// extensions: [new ClipExtension()],
							// clipBounds: [left, bottom, right, top]
							// pickable: false,
							// onClick: (info, event) => console.log('Clicked:', info, event),
						})

						// const itemTwo = new BitmapLayer(props,{
						// 	image: `assets/toolbar-3.png`,
						// 	id: `${props.id}_${imageId}_bitmap2`,
						// 	bounds: [[left, bottom], [left, top], [right, top], [right, bottom]],//[0,5,5,0]
						// 	visible: zoom > tileLayerZoom,
						// })

						// const TEXT_DATA = [
						// 	{
						// 		text: imageName,
						// 		position: [imageCoorsFinal[0]+.1, imageCoorsFinal[1]-.19],
						// 		size:.33
						// 	},
						// 	{
						// 		text: comments,
						// 		position: [imageCoorsFinal[0]+5-.45, imageCoorsFinal[1]-.93],
						// 		size: .33
						// 	},
						// 	{
						// 		text: likes,
						// 		position: [imageCoorsFinal[0]+5-.45, imageCoorsFinal[1]-.31],
						// 		size: .33
						// 	}
						// ];

						// const textLayer = new TextLayer(props, {
						// 	data: TEXT_DATA,
						// 	id: `TextLayer-${imageId}-${props.id}`,
						// 	getPosition: d => d.position,
						// 	getText: d => {
						// 		return d.text;
						// 		return JSON.stringify(courtsFaveCount[0])//'d.text,
						// 	},	
						// 	//characterSet: 'auto',
						// 	fontFamily: "-apple-system,BlinkMacSystemFont,Helvetica,Arial,sans-serif",
						// 	getAlignmentBaseline: 'center',
						// 	getColor: [255, 255, 255],
						// 	getSize: d => d.size,
						// 	// background: true,
						// 	// getBackgroundColor: [0,0,0],
						// 	getTextAnchor: 'start',
						// 	sizeUnits: 'common',
						// 	visible: zoom > tileLayerZoom,
						// 	// updateTriggers: {
						// 	// 	getText: courtsFaveCount
						// 	// }
						// });

						// const ICON_DATA = [
						// 	{
						// 		position: [imageCoorsFinal[0]+5-.5, imageCoorsFinal[1]-.5],
						// 		color: [255, 0, 0],
						// 	}
						// ];


						// if(zoom > 4.5){
							layers.push(item);
							// layers.push(itemTwo);
						// }

						// layers.push(textLayer);


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
		})

		firstTileLayer = tileLayer;
		// layers.push(tileLayer)
	}

	async function makeIconLayers(){
		layers = [];
		for (let layer in layerProps.slice(0,fetchedChunks+1)){
			let iconLayer = new IconLayer({
				...layerProps[layer]
			})
			layers.push(iconLayer)
		}
		return true;
	}

	function getScreenCoordinates(coords,viewport) {
		if(coords && viewport){
			return viewport.project([coords[0]-(sizes.size/2),coords[1]-(sizes.size/2)]);
		}
		else {
			return [0,0];
		}
  	}


  	function updateScreenCoordinates(viewport) {
		screenCoordinates = renderedSublayers.map(d => {
			let pos = getScreenCoordinates(d.coordinates,viewport);
			let width = getScreenCoordinates([sizes.size*2,0],viewport)[0]-getScreenCoordinates([sizes.size,0],viewport)[0];
			return {
				id:d.id,
				screenPosition: pos,
				screenWidth: width,
				info: d
			}
		});
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
		mounted = true;

		sizes = calcSquareSize(viewportWidth,viewportHeight,courtData.length,10);
		

		await new Promise(async(resolve, reject) => { 
			const response = await fetch('assets/land-110m.json');
			const data = await response.json();
			resolve(data);
		})
		.then((result) => {						
        	geoJSON = result;
    	})

		await new Promise(async(resolve, reject) => {    	
			supaBaseData = index(await countFaves(), d => d.court_id);
			console.log(supaBaseData)
			resolve(supaBaseData);
		})
		.then((result) => {						
        	console.log(result);
    	})

		let support = selectSupportedBasisFormat();

		setLoaderOptions({
			'basis': {
					format: support,//"astc-4x4",
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

		const geocoder = new MapboxGeocoder({
			accessToken: 'pk.eyJ1IjoiZG9jazQyNDIiLCJhIjoiY2x5YzVlcXZ4MW1qajJsb3RoeWI0bzhmZyJ9.DY653tAkLZCDMMEPuFvoGA',
			types: 'region,postcode,district,place,neighborhood',
			options: {
				marker: false,
			}
		});
		geocoder.addTo(inputBox)
		geocoder.setPlaceholder("Search for a location...")

		geocoder.on('result', async(e) => {
    		await sortImages(e,false);
			rebuildGrid();
		});

		geocoder.on('clear', async(e) => {
    		await sortImages(false,false);
			rebuildGrid();
		});

		geoCoderAdded = true;

		deckgl = new Deck({
			parent: el,
			views: new OrthographicView(),
		    initialViewState: { 
				target: [viewportWidth/2, viewportHeight/2, 0],
				zoom: 1,
				transitionInterpolator: new LinearInterpolator(['zoom','target']),
			    transitionDuration: 1000
			},
			onClick: ({x,y}) => {
				console.log(x,y)

				let selected = screenCoordinates.filter(d => {
					let box = [d.screenPosition[0],d.screenPosition[0]+d.screenWidth,d.screenPosition[1], d.screenPosition[1] + d.screenWidth];
					return (box[0] < x && box[1] > x) && (box[2] < y && y < box[3])
				})

				// console.log(x,y,selected.length,screenCoordinates,renderedSublayers,selected)

				if(selected.length > 0){
					let image = selected[0];
					let xPercent = (x-image.screenPosition[0])/image.screenWidth;
					let yPercent = (y-image.screenPosition[1])/image.screenWidth;

					// console.log(xPercent,yPercent)
					if(xPercent > .79){
						// console.log("valid")
						if(yPercent > .89){
							console.log("heart clicked")
							updateFromHeartClick(image.id,image,[x,y]);							
						}
						else if(yPercent > .75){
							// console.log("comment")
							updateFromCommentClick(image.id);
						}
					}
					else if (xPercent < .1 && yPercent < .13){
						threeDId = image.info.id;
						threeDNode = image.info.latLong;
						$isThreeD = true;
					}
				}
			},
			onLoad: () => {
				deckAdded = true;
				loadChunks();
			},
			onViewStateChange: ({viewState}) => {
				// currentViewState = deckgl.viewState;
				// console.log(viewState,currentViewState)
				zoom = viewState.zoom;
				targetDeck = viewState.target;
				// console.log(viewState);

				let width = viewportWidth;
				let height = viewportHeight;
				let viewport = new OrthographicView().makeViewport({width,height,viewState});
				updateScreenCoordinates(viewport);

				//do i need this???
				// deckgl.setProps({viewState});
  			},
			controller: true,
			layers: layers
		});
	})

	function zoomTo(zoomLevel){
		return new Promise((resolve, reject) => {
			console.log("zoomStart")
			const interpolator = new LinearInterpolator({transitionProps:['zoom','target']});

			deckgl.setProps({
				views: new OrthographicView(),
				initialViewState: {
					target: [Math.floor(sizesFiltered.rowSize*sizes.size/2), Math.floor(spritePositionsMaster.length/sizesFiltered.rowSize)*sizes.size/2, 0],
					zoom: zoomLevel,
					controller: true,
					transitionDuration: 1000,
					transitionInterpolator: interpolator,
					transitionEasing: easeCubic,
					layers: layers,
					onTransitionEnd: () => {
						// setTimeout(() => {
						// 	console.log("zooming again")
						// 	zoomTo(2);
						// },1000)
						// resolve();
					}
				},
			});

		})
	}


	let heartCoors = [-100,-100];

	async function updateFromHeartClick(id,image,coors){
		heartCoors = coors;
		favoritedCourt = `#${formatComma(image.info.court_count)} in ${image.info.location}, ${image.info.state}`

		favoriteActive = true;

		courtsWithFavorites[id] = (courtsWithFavorites[id] || 0) + 1;
		courtsFaveCount = [courtsFaveCount[0] + 1];
		courtsFaveCount = [...courtsFaveCount];


		spritePositionsMaster = await makeMasterData(filteredIds,courtData);

		await loadText();
		
		deckgl.setProps({
			layers: layers.concat([firstTileLayer,iconAtlasLayer,textLayer])
		});

		addRow(id);
		
		setTimeout(() => {
			favoriteActive = false;
		},5000)
	}

	async function updateFromCommentClick(id){
		commentId = id;
		$isCommenting = true;
	}

	async function handleCommentSubmit(event){
		const id = event.detail;

		courtsWithComments[id] = (courtsWithComments[id] || 0) + 1;
		courtsFaveCount = [courtsFaveCount[0] + 1];
		courtsFaveCount = [...courtsFaveCount]

		spritePositionsMaster = await makeMasterData(filteredIds,courtData);

		await loadText();
		
		deckgl.setProps({
			layers: layers.concat([firstTileLayer,iconAtlasLayer,textLayer])
		});
	}

	async function rebuildGrid(){
		let zoom = Math.log2(sizesFiltered.size / sizes.size);

		zoomTo(zoom-.2);

		await assignDataToIconLayers()
		await makeIconLayers();
		await makeTileLayer();
		await loadTestIconAtlas();
	  	await loadText();

		deckgl.setProps({
			layers: layers.concat([firstTileLayer,iconAtlasLayer,textLayer])
		});

	}


	function sortImages(locationData,colorData){
		return new Promise((resolve, reject) => {
			if(locationData){
				filteredIds = filterLocation(courtData,locationData,"bbox");
				if(filteredIds.length == 0){
					filteredIds = ["none"]
				}
			}
			else if (colorData) {
				filteredIds = filterColor(courtData,colorData)//filterLocation(courtData,locationData,"bbox");
				if(filteredIds.length == 0){
					filteredIds = ["none"]
				}
			}
			else {
				filteredIds = []
			}

			spritePositionsMaster = makeMasterData(filteredIds,courtData);
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


	function handleDragStart(event) {
    	event.stopPropagation();
		event.preventDefault();
  	}

	$: countTween = tweened(0, {
		duration: 10000,
	});

	let sortValue = null;

	async function handleSort(sortvalue){
		await sortImages(false,false);
		rebuildGrid();
	}


	async function handleColorClick(colorSet){
		if(swatchSet !== colorSet){
			swatchSet = colorSet;
			await sortImages(false,colorSet);
			rebuildGrid();
		}
		else {
			swatchSet = null;
			await sortImages(false,false);
			rebuildGrid();
		}
	}

	function handleStartButtonClick() {
		skipIntro = true;
		zoomTo(3)
	}

	function handleWorldFinished() {
		console.log("world finished")
		showEl = true;
	}

</script>



{#if $isThreeD == true}
	<div in:fly={{y:-20, duration:500}} class="three-d">
		<button class="three-d-close" on:click={() => {
			console.log("button click")
			$isThreeD = false;
		}}>Close</button>
		<ThreeD coords={threeDNode}/>
	</div>
{/if}


{#if !skipIntro}
<div class="loading-overlay" style="display:{deckAdded ? "" : ''};">

	{#if geoJSON && spritePositionsMaster}
		<div class="world-map">
			<WorldMap on:finished={handleWorldFinished} {sizes} {geoJSON} courtData={spritePositionsMaster} {viewportHeight} {viewportWidth}/>
		</div>}
	{/if}

	{#if supaBaseData}
		<div transition:fly={{y:20, duration:1000, delay:500}} class="loading-text">
		{#if !countTweenFinished}
			<p transition:fly={{y:20, duration:1000, delay:0}} class="every">Loading Satellite Imagery of {formatComma(Math.round($countTween*spritePositionsMaster?.length/100)*100)} of {formatComma(spritePositionsMaster?.length)} Basketball Courts</p>
			<!-- <p transition:fly={{y:20, duration:1000, delay:0}} style="opacity:{spritePositionsMaster ? 1 : 0};" class="count">{formatComma(Math.round($countTween*spritePositionsMaster?.length/100)*100)} courts</p> -->
				<!-- <p style="opacity:{dummy ? 1 : 0};">Dummy Basis Loaded</p>
				<p style="opacity:{texturesLoaded ? 1 : 0};">Textures Loaded</p>
				<p style="opacity:{geoCoderAdded ? 1 : 0};">Geocoder Loaded</p>
				<p style="opacity:{deckAdded ? 1 : 0};">Deck Added</p> -->
		{/if}
		</div>
	{/if}

	{#if countTweenFinished}
		<div transition:fly={{y:20, duration:1000, delay:500}} class="loading-text">
			<div class="logo">
				<a href="https://pudding.cool" target="_blank">
					{@html Mark}
				</a>
			</div>
			<p class="every">
				<span>Every Outdoor Basketball Court in the U.S.A.</span>
			</p>	
			<p class="every every-small">
				<span>Explore by Panning and Zooming on 57,000 Courts</span>
			</p>
			<div class="start-button-container">
				<button class="start-button" on:click={() => handleStartButtonClick()}>Begin Exploring</button>
			</div>	
		</div>
	{/if}


</div>
{/if}


<div class="overlay" id="overlay">
	{#if $isCommenting == true}
		<Comment {commentId} on:formSubmit={handleCommentSubmit} />
	{/if}
	<!-- <h1>{renderedSublayers.length}</h1> -->
	
	<!-- {#each screenCoordinates as layer (layer.info.id) }
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
					width:10px;
					background: red;
					height:10px;
				"
			>
			</div>
		</div>
	{/each} -->
</div>

<div class="toolbar {skipIntro ? 'toolbar-visible' : ''}">
	<div class="toolbar-logo">
		<a href="https://pudding.cool" target="_blank">
			{@html Mark}
		</a>
	</div>

	<div class="settings">
		<div bind:this={inputBox} id="geocoder" class="geocoder">
		</div>
		<div class="color-finder">
			<span>Court Color</span>
			<div class="color-swatches">
			{#each colors as color, i}
				<button
					on:click={() => handleColorClick(color)}
					class="{color == swatchSet ? 'swatch-selected' : ''}"
					style="
						background:{color};
						border-top-right-radius: {i == colors.length - 1 ? '5px' : ''};
						border-bottom-right-radius: {i == colors.length - 1 ? '5px' : ''};
						border-top-left-radius: {i == 0 ? '5px' : ''};
						border-bottom-left-radius: {i == 0 ? '5px' : ''};
					"
				>
				</button>
			{/each}
			</div>
			<span class="sorted-by">Sort By</span>
			<div class=sort-buttons>
				<button
					on:click={() => handleSort("heart")}
				>♡</button>
				<button
					on:click={() => handleSort("comment")}
				>💬</button>
			</div>
		</div>
	</div>
	<!-- <button on:click={() => sortColor(courtData)}>sort</button> -->
</div>

<div style="" class="el" class:showEl bind:this={el}>
</div>

<div class="favorite-text" class:favoriteActive>
	{#key heartCoors}
		<div in:fly={{y:20, duration:5000}} class="heart-popup" style="width:{(30 / Math.pow(2, 6 - zoom))+10}px;left:{heartCoors[0]}px; top:{heartCoors[1]-50}px;">
			<svg viewBox="0 0 109 94" fill="none" xmlns="http://www.w3.org/2000/svg">
				<path d="M108.993 28.105C109.106 33.5843 107.785 38.7298 105.622 43.7363C103.599 48.409 101.013 52.7481 97.7541 56.6698C96.3211 58.3664 94.86 60.0352 93.2865 61.5928C84.9975 69.9091 76.54 78.0586 67.7172 85.8186C64.8512 88.3219 61.9852 90.8251 58.782 92.939C56.5903 94.3853 52.8252 94.3575 50.6335 92.8278C49.5939 92.1046 48.5262 91.3814 47.5708 90.5748C36.4158 81.1459 25.6262 71.2998 15.286 60.9809C9.35732 55.0566 4.97401 48.1865 2.22039 40.2874C0.871683 36.3935 -0.0274579 32.3327 0.000640266 28.2162C0.0568366 18.843 3.51291 10.9995 11.549 5.52015C14.1902 3.71225 17.1124 2.4606 20.0908 1.32024C21.9172 0.652705 23.7998 0.430212 25.7104 0.207701C33.6903 -0.682341 40.8834 1.29246 47.2898 6.04862C49.3129 7.55057 51.2517 9.2194 53.2185 10.8326C53.8367 11.3332 55.2697 11.361 55.8879 10.8882C56.3936 10.4988 56.9275 10.1651 57.4333 9.77566C58.4167 8.96906 59.3158 8.07904 60.2993 7.27243C61.2827 6.46583 62.2942 5.71487 63.362 5.01952C68.5601 1.62624 74.2359 -0.0982711 80.5018 0.0129841C87.8074 0.124239 94.1856 2.62753 99.8053 7.189C103.879 10.471 106.549 14.7265 108.066 19.6774C108.909 22.4309 108.965 25.2679 108.993 28.105Z" fill="#FF0000"/>
			</svg>
		</div>
	{/key}

	<p>Like Added to Court {favoritedCourt}</p>
</div>

{#if spritePositionsMaster}
	<div class="search-results">
		<!-- <p>{formatComma(spritePositionsMaster.length)} courts</p> -->
	</div>
{/if}


{#if mounted}
	<div class="noise-overlay mounted" style="background: url(assets/noise-light.png);">
	</div>
{/if}






<style>
	.noise-overlay.mounted {
		opacity: .3;
	}

	.heart-popup {
		width: 20px;
		position: absolute;
		transform: translate(-50%,-50%);
	}

	.heart-popup svg {
		opacity: 0;
		animation:flutter;
		animation-duration: 5s;
	}
	.every {
		font-size: 24px;
		font-family: var(--sans);
		margin: 0;
		margin-bottom: 10px;
	}

	.every span, .every-small span {
		background-color: black;
		padding: 10px 10px;
	}

	.every-small {
		font-size: 16px;
	}

	.loading-text {
		position: absolute;
		z-index: 100000;
		display: flex;
		width: 100%;
		flex-direction: column;
		justify-content: center;
		height: 100%;
	}

	.loading-overlay p {
		color: white;
		text-align: center;
		font-weight: 300;
		font-family: var(--sans);
		transition: opacity 1.5s;
	}

	.world-map {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		z-index: 1000;
		width: 100%;
		height: 100%;
		pointer-events: none;
	}
	.search-results {
		position: absolute;
		top: 0;
		left: 0;
		z-index: 10000;
		pointer-events: none;
		text-align: center;
		color: white;
		margin: 0 auto;
		width: 100%;
		height:	100%;
	}
	.search-results p {
		color: white;
		font-family: var(--sans);
	}

	.start-button {
		margin: 0 auto;
    	display: block;
		background:white;
		font-size: 18px;
		margin-top: 10px;
		padding: 10px 30px;
		border-radius: 50px;

	}

	.favorite-text {
		position: absolute;
		top: 0;
		left: 0;
		z-index: 1000;
		width: 100%;
		height: 100%;
		opacity: 0;
		pointer-events: none;
		background-color: rgba(0,0,0,0);

	}

	.favorite-text p {
		font-family: var(--sans);
		color: white;
		text-align: center;
		position: absolute;
		top: 50%;
		left: 0;
		right: 0;
		transform: translate(0,-50%);
		margin: 0 auto;
	}

	.favoriteActive {
		opacity: 1;
		/* animation: fadeInOut; */
		/* animation-duration: .2s; */
		background-color: rgba(0,0,0,.8);
		transition: background-color .5s, opacity .5s;
	}

	.noise-overlay {
		position: fixed;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		pointer-events: none;
		opacity: 0;
		transition: opacity .5s;
	}

	@keyframes flutter {
		0% {transform: rotate(4deg);opacity:1;}
		50% {transform: rotate(-4deg);opacity:1;}
		100% {transform: rotate(4deg);opacity: 0;}
	}

	@keyframes fadeInOut {
		0% {opacity: 0;}
		10% {opacity: 1;}
		80% {opacity: 1;}
		100% {opacity: 0;}
	}

	.loading-overlay {
		position: absolute;
		top: 0;
		left: 0;
		z-index: 1000;
		width: 100%;
		height: 100%;
	}
	.loading-overlay p {
		text-align: center;
	}
	.three-d-close {
		position: absolute;
		top: 10px;
		left: 10px;
		color: white;
		margin: 0;
		font-family: var(--sans);
		font-size: 12px;
		background-color: black;
		z-index: 100;

	}
	.three-d {
		width: 300px;
		height: 300px;
		position: fixed;
		z-index: 1000000000;
		bottom: 50px;
		left: 50px;
		border: 2px solid #fffca8;
	}
	.overlay {
		position: fixed;
		top: 0;
		left: 0;
        z-index: 1000;
	}

	.overlay-test {
		pointer-events: none;
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

	.geocoder {
		pointer-events: all;
	}

    .el {
        width: 100%;
		height: 100%;
		position: absolute;
		top: 0;
		left: 0;
		display: none;
    }

	.el.showEl {
		display: block;
	}

	.settings {
		display: flex;
	}

	.toolbar-logo {
		width: 140px;
		transform:translate(0,5px) rotate(-4deg);
		pointer-events: all;
	}


	.toolbar {
		position: fixed;
		display: -webkit-box;
		display: flex;
		top: 0rem;
		pointer-events: none;
		z-index: 10000;
		left: 0;
		right: 0;
		margin: 0 auto;
		justify-content: space-between;
		opacity: 0;
		transform: translate(0,-50px);
		transition: transform .5s, opacity .5s;
		padding: 2rem;
		background: linear-gradient(180deg, black, rgba(0,0,0,0));
		padding-bottom: 6rem;
	}

	.toolbar-visible {
		transform: translate(0,0px);
		opacity: 1;
	}

	.color-finder {
		font-family: var(--sans);
		background-color: black;
		color: white;
		pointer-events: all;
		font-size: 14px;
		display: flex;
		align-items: center;
		margin-left: 20px;
		padding: 2px 10px;
		border-radius: 5px;
	}

	.color-swatches {
		display: flex;
	}

	.color-swatches button {
		border-radius: 0px;
		min-width: 30px;
		min-height: 20px;
	}

	.swatch-selected {
		position: relative;
	}

	.swatch-selected:after {
		content: '';
		background-color: rgba(0,0,0,.2);
		position: absolute;
		outline: 1.5px solid white;
		border-radius: 1px;
		top: 0;
		left: 0;
		height: 100%;
		width: 100%;
	}

	.color-finder span {
		-webkit-font-smoothing: antialiased;
  		-moz-osx-font-smoothing: grayscale;
		text-transform: uppercase;
		letter-spacing: .5px;
		font-size: 11px;
		font-weight: 500;
		margin-right: 10px;
		pointer-events: none;
		user-select: none;
		width: 65px;
		line-height: 1.2;
		text-align: right;
	}
	.color-finder span.sorted-by {
		margin-left: 20px;
		width: 40px;
	}

	.sort-buttons {
		display: flex;
	}

	.sort-buttons button {
		background-color: #333;
		margin-right: 10px;
		padding: 5px 10px;
		color: white;
	}

	.logo {
		width: 200px;
		transform: rotate(-4deg);
		margin: 0 auto;
		margin-bottom: 30px;
	}

	.logo a, .toolbar-logo a {
		border: none;
		text-decoration: none;
	}
</style>
