<script>
	import { onMount } from "svelte";
	import { easeCubic, index, format, csv } from "d3";
	import filterLocation from '$actions/filterAddresses.js'
	import filterColor from '$actions/filterColors.js';
	import {Deck, OrthographicView, OrthographicViewport, COORDINATE_SYSTEM, LinearInterpolator} from '@deck.gl/core';
	import {IconLayer, BitmapLayer, TextLayer} from '@deck.gl/layers';
	import {TileLayer} from '@deck.gl/geo-layers';
	import { fly, fade } from 'svelte/transition';
	import WorldMap from "$components/WorldMap.svelte";
    import { tweened } from "svelte/motion";
	import calcSquareSize from "$actions/getMaxSizeSquare.js"
	import calcSquareSizeFiltered from "$actions/getMaxSizeSquareFiltered.js"
	import Mark from "$svg/mark.svg";
	import About from "$components/About.svelte"

	import ThreeD from "$components/ThreeD.svelte"
	import Comment from "$components/Comment.svelte"

	import {
		isCommenting, isThreeD, aboutVisible
	} from "$stores/misc.js";

	import {
		countFaves,
		addRow		
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

	
	let skipIntro = true;
	let showEl = true;
	let locationQueried = false;
	let savedData = 0;
	let keyboardControls = false;
	let geocoder;
	let showHelp = false;
	let mobileMin = 0;
	let mobile = false;
	let textVisibility = true;
	let toolbarVisibility = true;

	let textData;
	if(viewportWidth < 500){
		mobile = true;
		mobileMin = 4
		textVisibility = false;
		toolbarVisibility = false;
	}
	
	let sizesFiltered;
	let courtData;
	let loadingDone = false;
	let swatchSet = null;
	let waiting = false;
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
	let zoom = 1;
	let tileMinZoom = 4.5;

	if(viewportWidth < 500){
		tileMinZoom = 4.99;
	}

	let tileLayerZoom = 4.99;
	
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


	$: console.log(zoom)

	$: if(mobile && zoom > mobileMin){
		showTextLayer();
	};

	async function showTextLayer(){

		if(loadingDone && !textVisibility && !toolbarVisibility){

			waiting = true;
			// changeWaiting(waiting);

			textVisibility = true;
			toolbarVisibility = true;
			
			await loadText();
			await loadTestIconAtlas();

			deckgl.setProps({
				layers: layers.concat([firstTileLayer,iconAtlasLayer,textLayer]),
			});

			setTimeout(() => {
				waiting = false;
				// changeWaiting(waiting);

			},500)

			console.log("show text layer",zoom,mobileMin);
		}
	}

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

			// console.log(spritePositionsMaster.slice(0,10))
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
		return new Promise(async (resolve, reject) => {

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
				visible: textVisibility,
				iconMapping: iconMapping,
				iconAtlas:`assets/toolbar-3.png`,
			};

			if(!mobile){
				props.transitions = {
					getPosition: {
						duration: 500,
						easing: easeCubic
					}
				}
			}

			iconAtlasLayer = new IconLayer({
				...props
			})
			resolve();
		})

	}

	async function makeTextData() {
		return new Promise(async (resolve, reject) => {

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

			resolve(textData);
		})
	}

	async function loadText(){

		return new Promise(async (resolve, reject) => {

			let props = {
				data: textData,
				id: `TextLayer-test`,
				getPosition: d => d.position,
				getText: d => {
					return d.text;
				},
				maxWidth: 10,
				getAlignmentBaseline: 'top',
				fontFamily: "-apple-system,BlinkMacSystemFont,Helvetica,Arial,sans-serif",
				getAlignmentBaseline: 'center',
				getColor: [255, 255, 255],
				visible: textVisibility,
				getSize: d => d.size,
				getTextAnchor: 'start',
				sizeUnits: 'common',
				updateTriggers: {
					getText: courtsFaveCount
				}
			};

			if(!mobile){
				props.transitions = {
					getPosition: {
						duration: 500,
						easing: easeCubic
					}
				}
			}

			textLayer = new TextLayer({
				...props
			})
			resolve();
		})
	}

	async function changeWaiting(setting){
		console.log(waiting)
		if(!setting){
			console.log("turningon")
			deckgl.setProps({
				controller: {
					scrollZoom: true,
					dragPan: true,
					dragRotate: true,  // Rotation enabled by default
					touchRotate: true
				}
      		});
		} else {

			console.log("turningOff")
			deckgl.setProps({
				controller: {
					scrollZoom: false,
					dragPan: false,
					dragRotate: false,  // Rotation enabled by default
					touchRotate: false
				}
      		});
		}
	}

	async function fullGrid(){
		waiting = true;
		// changeWaiting(waiting);
		if(mobile){
			textVisibility = false;
			toolbarVisibility = false;
		}
		
		await assignDataToIconLayers()
		await makeIconLayers();
		textData = [...await makeTextData()];
		zoomTo(1,true);

		setTimeout(async() => {

			await loadTestIconAtlas();
			await loadText();

			// console.log(layers)

			deckgl.setProps({
				layers: layers.concat([firstTileLayer,iconAtlasLayer,textLayer])
			});


			// deckgl.setProps({
			// 	views: new OrthographicView(),
			// 	initialViewState: {
			// 		target: [viewportWidth/2, viewportHeight/2, 0],
			// 		zoom: 1,
			// 		controller: true,
			// 		// layers: layers.concat([firstTileLayer,iconAtlasLayer,textLayer]),
			// 	}
			// })
			
			if(!sortValue){
				courtsFaveCount = [courtsFaveCount[0] + 1];
				courtsFaveCount = [...courtsFaveCount];
			}

			waiting = false;
			// changeWaiting(waiting);

		},1000)


	}

	async function rebuildGrid(){
		let zooming;

		waiting = true;
		// changeWaiting(waiting);

		await assignDataToIconLayers()
		await makeIconLayers();

		textData = await makeTextData();

		if(!sortValue){
			console.log("changing court fave count")
			courtsFaveCount = [courtsFaveCount[0] + 1];
			courtsFaveCount = [...courtsFaveCount];
		}

		if(sizesFiltered.rowSize !== 0){
			zooming = Math.log2(sizesFiltered.size / sizes.size);
			zoomTo(zooming-.2);
		}

		setTimeout(async() => {

			await loadTestIconAtlas();
			await loadText();
			await makeTileLayer();

			deckgl.setProps({
				layers: layers.concat([firstTileLayer,iconAtlasLayer,textLayer]),
			});

			waiting = false;
			// changeWaiting(waiting);

			
		},1000)
	}

	async function handleStartButtonClick() {
		await loadTestIconAtlas();
		textData = await makeTextData();
		await loadText();

		deckgl.setProps({
			layers: layers.concat([
				firstTileLayer,
				iconAtlasLayer,
				textLayer
			])
		});

		skipIntro = true;
		// await assignDataToIconLayers()
		// await makeIconLayers();
		// await loadTestIconAtlas();
	  	// await loadText();

		showHelp = true;
		
		setTimeout(() => {
			showHelp = false;
		},6000)
	}


	async function loadChunks() {
      while ((chunk = await fetchNextChunk())) {
		makeIconLayers();
		deckgl.setProps({
			layers: layers
		});
      }
	  await makeTileLayer();

	  loadingDone = true;
	  console.log("loading done")
	  
	  await loadTestIconAtlas();
	  textData = await makeTextData();
	  await loadText();

	  deckgl.setProps({
	  	layers: layers.concat([
			firstTileLayer,
			iconAtlasLayer,
			textLayer
		])
	  });

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
			};
			if(viewportWidth > 500){
				props.transitions = {
					getPosition: {
						duration: 500,
						easing: easeCubic
					}
				}
			}

			layerProps.push(props);
		}

		await preloadBasisLoader()//.then(async() => {
		dummy = true;

		if(!skipIntro){
			countTween.set(1).then(() => {
				countTweenFinished = true;
				// swatchSet = colors[1];
				// sortImages(false,swatchSet);
				// rebuildGrid();
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
		return new Promise(async (resolve, reject) => {
			let tileLayer = new TileLayer({
				tileSize: 256,
				minZoom: 5,
				debounceTime: 100,
				id:`tileLayer_`,
				coordinateSystem: COORDINATE_SYSTEM.CARTESIAN,
				// visible: zoom > 8,
				onViewportLoad: layers => {
					// console.log(layers,"hi")
					let oldLength = renderedSublayers.length;

					renderedSublayers = Array.from(layers
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
					if(zoom < tileMinZoom){
						// console.log(id)
						// console.log("no working")
						return null;
					}
					if (signal.aborted) {
						return null;
					}
					return getData(bbox, id, signal);
				},
				updateTriggers: {
					renderSubLayers: courtsFaveCount,
					getTileData:[courtsFaveCount,sortValue,swatchSet,locationQueried],
					all:courtsFaveCount,
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


							let imgType = "jpg"
							let imgPath = `https://s3.amazonaws.com/pudding.cool/projects/courts/${imgType}/${imageId}.${imgType}`
							
							if(viewportWidth < 500){
								imgType = "webp";
								let imgSize = 150;
								imgPath = `https://s3.amazonaws.com/pudding.cool/projects/courts/${imgType}/${imgSize}/${imageId}.${imgType}`
							}

							
							if(zoom > tileMinZoom && props.tile.zoom > 3){
								const item = new BitmapLayer(props,{
									image: imgPath,
									id: `${props.id}_${imageId}_bitmap`,
									bounds: imageCoorsFinal,//[0,5,5,0]
								})
								layers.push(item);
							}
						}

						// console.log(props.tile)
						// const {boundingBox} = props.tile;

						// let outline = new BitmapLayer(props,{
						// 	image: `assets/box2.png`,
						// 	id: `${props.id}_outline`,
						// 	bounds: [boundingBox[0][0], boundingBox[0][1], boundingBox[1][0], boundingBox[1][1]]//[bounds[0]+1,bounds[1]+1,bounds[2]-1,bounds[3]-1]
						// 	//bounds: [left,bottom,right,top]
						// })

						// layers.push(outline);

						}


					// renderedSublayers = [...renderedSublayers];

					return layers
				},
			})

			firstTileLayer = tileLayer;
			resolve();
		})
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

		// console.log(screenCoordinates)
  	}

	async function getData(bbox, id, signal) {
  		// Stall for 20ms - simulate an async request
  		await new Promise(resolve => setTimeout(resolve, 100));

		if(!courtData){
			return [];
		}

		if(signal.aborted){
			return null;
		}

		const { left, right, top, bottom } = bbox;

		let highResData = [];
		for (let i = 0; i < spritePositionsMaster.length; i++) {
			const d = spritePositionsMaster[i];
			const [x, y] = d.coordinates;
			if ((x + sizes.size/2) >= left && (x + sizes.size/2) <= right && (y + sizes.size/2) >= top && (y + sizes.size/2) <= bottom) {
				highResData.push(d);
			}
		}

		return highResData
	}



	onMount(async () => {
		mounted = true;


		courtData = await new Promise(async(resolve, reject) => { 
			const data = await csv('assets/data.csv');
			resolve(data);
		});

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
		savedData = [...spritePositionsMaster];
		console.log("sprite positions loaded")

		spriteMap = await makeSpriteObject();
		


		await makeIconLayersProps();
		await assignDataToIconLayers()
		await makeIconLayers();

		geocoder = new MapboxGeocoder({
			accessToken: 'pk.eyJ1IjoiZG9jazQyNDIiLCJhIjoiY2x5YzVlcXZ4MW1qajJsb3RoeWI0bzhmZyJ9.DY653tAkLZCDMMEPuFvoGA',
			types: 'region,postcode,district,place,neighborhood',
			countries: "us",
			options: {
				marker: false,
				countries: "us"
			}
		});
		geocoder.addTo(inputBox)
		geocoder.setPlaceholder("Search for a location...")
		geocoder.setCountries("us")

		geocoder.on('result', async(e) => {
			sortValue = null;
			swatchSet = null;
    		await sortImages(e,false);
			rebuildGrid();
			const geocoderInput = document.querySelector('.mapboxgl-ctrl-geocoder input');
			if (geocoderInput) {
				geocoderInput.blur();
			}


			locationQueried = e.result.text;
		});

		geocoder.on('clear', async(e) => {

		});

		geoCoderAdded = true;

		deckgl = new Deck({
			parent: el,
			views: new OrthographicView(),
		    initialViewState: { 
				target: [viewportWidth/2, viewportHeight/2, 0],
				zoom: zoom,
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

					// console.log(image,[x,y])



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

	function zoomTo(zoomLevel,full){
		return new Promise((resolve, reject) => {
			console.log("zoomStart")
			const interpolator = new LinearInterpolator({transitionProps:['zoom','target']});
			let target = [Math.floor(sizesFiltered.rowSize*sizes.size/2), Math.floor(spritePositionsMaster.length/sizesFiltered.rowSize)*sizes.size/2, 0];
			if(full) {

				deckgl.setProps({
					views: new OrthographicView(),
					initialViewState: {
				 		target: [viewportWidth/2, viewportHeight/2, 0],
						zoom: 1,
						controller: true,
						layers: layers,
					},
				});
			}
			else {

				let transitionDuration = 1000;
				if(spritePositionsMaster.length == courtData.length && viewportWidth < 500){
					transitionDuration = 0;
				}

				deckgl.setProps({
					views: new OrthographicView(),
					initialViewState: {
						target: target,
						zoom: zoomLevel,
						controller: true,
						transitionDuration: transitionDuration,
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

			}


		})
	}


	let heartCoors = [-100,-100];

	async function updateFromHeartClick(id,image,coors){
		heartCoors = coors;
		favoritedCourt = `#${formatComma(image.info.court_count)} in ${image.info.location}, ${image.info.state}`

		favoriteActive = true;

		courtsWithFavorites[id] = (courtsWithFavorites[id] || 0) + 1;

		spritePositionsMaster = await makeMasterData(filteredIds,courtData);

		textData = [...await makeTextData()];

		courtsFaveCount = [courtsFaveCount[0] + 1];
		courtsFaveCount = [...courtsFaveCount];

		await loadText();
		deckgl.setProps({
			layers: layers.concat([firstTileLayer,iconAtlasLayer,textLayer])
		});

		addRow(id);
		
		setTimeout(() => {
			favoriteActive = false;
		},3000)
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

		textData = [...await makeTextData()];

		courtsFaveCount = [courtsFaveCount[0] + 1];
		courtsFaveCount = [...courtsFaveCount];

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

	$: countTween = tweened(0, {
		duration: 10000,
	});

	let sortValue = null;

	async function handleSort(selected){
		sortValue = selected;
		swatchSet = null;
		geocoder.setInput('');
		locationQueried = null;

		await sortImages(false,false);
		fullGrid();
	}

	async function handleKeyboardButtonPress(button,box,event){
		// console.log(button,box,event)
		if(button == "like"){
			updateFromHeartClick(box.id,box,[event.x,event.y]);
		}
		else if (button == "comment"){
			updateFromCommentClick(box.id);
		}
		else if (button == "mag") {
			threeDId = box.info.id;
			threeDNode = box.info.latLong;
			$isThreeD = true;
		}

	}

	async function handleAbout(){
		$aboutVisible = true;
	}

	async function handleZoomClick(dir){
		console.log(zoom)
		if(dir == "out"){
			zoomTo(zoom - 1);
		}
		else {
			zoomTo(zoom + 1);
		}
	}

	async function handleClear(){
		geocoder.setInput('');
		sortValue = null;
		locationQueried = null;

		sortValue = null;
		swatchSet = null;
		// let beforeLength = spritePositionsMaster.length;
		spritePositionsMaster = savedData;
		fullGrid();



		// await sortImages(false,false);
		// let afterLength = spritePositionsMaster.length;
		// if(beforeLength !== afterLength){
		// 	rebuildGrid();
		// }
	}

	async function handleColorClick(colorSet){
		sortValue = null;
		geocoder.setInput('');
		locationQueried = null;


		if(swatchSet !== colorSet){
			swatchSet = colorSet;
			await sortImages(false,colorSet);
			rebuildGrid();
		}
		else {
			swatchSet = null;
			spritePositionsMaster = savedData;
			fullGrid();
		}
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
		<a target="_blank" href="http://maps.google.com/maps?q={threeDNode[1]},{threeDNode[0]}">
			<button class="maps-link">
				↗️ Google Maps
			</button>
		</a>
		<p class="instructions">Explore by Pan and Zooming</p>
		<ThreeD coords={threeDNode}/>
	</div>
{/if}


{#if !skipIntro}
<div class="loading-overlay" style="display:{deckAdded ? "" : ''};">

	{#if geoJSON && spritePositionsMaster}
		<div class="world-map">
			<WorldMap on:finished={handleWorldFinished} {sizes} {geoJSON} courtData={spritePositionsMaster} {viewportHeight} {viewportWidth}/>
		</div>
	{/if}

	{#if supaBaseData}
		<div transition:fly={{y:20, duration:1000, delay:500}} class="loading-text loading-start">
		{#if !countTweenFinished}
			<p transition:fly={{y:20, duration:1000, delay:0}} class="every every-start">Loading Satellite Imagery of {formatComma(Math.round($countTween*spritePositionsMaster?.length/100)*100)} of {formatComma(spritePositionsMaster?.length)} Basketball Courts</p>
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
				<span>Help us document the stories behind the 59,507 outdoor courts in America.</span>
			</p>
			{#if !loadingDone}
				<p class="every every-small">
					<span>Still loading...</span>
				</p>
			{:else}
				<div class="start-button-container">
					<button class="start-button" on:click={() => handleStartButtonClick()}>Begin Exploring</button>
				</div>
			{/if}
		</div>
	{/if}


</div>
{/if}

{#if waiting}
	<div class="waiting"
		transition:fade={{duration:500}}
	>
		<p class="every every-small">
			<span>Loading...</span>
		</p>
	</div>
{/if}




<div class="overlay" id="overlay">
	{#if $isCommenting == true}
		<Comment {commentId} on:formSubmit={handleCommentSubmit} />
	{/if}
			
	{#if $aboutVisible}
		<About />
	{/if}
</div>

{#if showHelp}
	<div class="helper" in:fade={{delay:1000, duration:2000}} out:fade={{duration:3000}}>
		<p>Zoom-in to Explore, like a Map!</p>
		<div class="finger">
			<svg xmlns="http://www.w3.org/2000/svg"  fill="none" viewBox="0 0 76 114">
				<path fill="#fff" d="M75 67v16c0 6-2 12-6 16-2 3-4 7-4 10v3a1 1 0 0 1-1 2 1 1 0 0 1-2-1v-4c0-4 2-8 5-12s5-9 5-14V67a4 4 0 0 0-1-3 3 3 0 0 0-4 0 4 4 0 0 0-2 3 1 1 0 1 1-3 0v-5a3 3 0 0 0-3-4 3 3 0 0 0-4 4v5a1 1 0 1 1-3 0v-5a3 3 0 0 0-2-3 4 4 0 0 0-4 0 3 3 0 0 0-1 3v5a1 1 0 1 1-3 0V35a4 4 0 0 0-4-4 4 4 0 0 0-4 4v42a1 1 0 1 1-3 0V66a4 4 0 0 0-4 4v13c0 5 2 10 5 14s5 8 5 12v4a2 2 0 0 1-2 1 2 2 0 0 1-1-2v-3c0-3-2-7-4-10-4-4-6-10-6-16V70a7 7 0 0 1 7-7V35a7 7 0 0 1 7-7 7 7 0 0 1 7 7v21a7 7 0 0 1 7 0l2 2a7 7 0 0 1 5-3 6 6 0 0 1 6 6h1a6 6 0 0 1 9 6ZM27 47a2 2 0 0 0 1-3 14 14 0 1 1 20 0 1 1 0 1 0 2 3 17 17 0 1 0-24 0h1ZM17 33H5l2-2a2 2 0 0 0-2-2l-4 5a1 1 0 0 0 0 2l4 5a2 2 0 0 0 2-3l-2-2h12a2 2 0 0 0 0-3Zm58 1-4-5a1 1 0 0 0-2 2l2 2H60a2 2 0 0 0 0 3h11l-2 2a1 1 0 1 0 2 3l4-5a1 1 0 0 0 0-2ZM40 5v10a1 1 0 1 1-3 0V5l-2 2a1 1 0 0 1-3-2l5-5a2 2 0 0 1 2 0l5 5a1 1 0 0 1-2 2l-2-2Z"/>
			</svg>
		</div>
		
	</div>
{/if}



<div class="toolbar {skipIntro ? 'toolbar-visible' : ''}">
	<div class="toolbar-logo">
		<a href="https://pudding.cool" target="_blank">
			{@html Mark}
		</a>
	</div>
	
	<div class="settings">
		<div bind:this={inputBox} id="geocoder" class="geocoder">
			{#if locationQueried}
				<div class="location-queried">
					<button
						on:click={() => handleClear()}
					>
						{locationQueried.length > 15 ? locationQueried.slice(0,12).concat("...") : locationQueried}
						<svg xmlns="http://www.w3.org/2000/svg" x="0px" y="0px" viewBox="0 0 8 8" width="8px" height="8px" xml:space="preserve" class="svelte-1x4usti"><path d="M0.5,8C0.37,8,0.24,7.95,0.15,7.85c-0.2-0.2-0.2-0.51,0-0.71l7-7c0.2-0.2,0.51-0.2,0.71,0s0.2,0.51,0,0.71l-7,7 C0.76,7.95,0.63,8,0.5,8z"></path><path d="M7.5,8C7.37,8,7.24,7.95,7.15,7.85l-7-7c-0.2-0.2-0.2-0.51,0-0.71s0.51-0.2,0.71,0l7,7c0.2,0.2,0.2,0.51,0,0.71 C7.76,7.95,7.63,8,7.5,8z"></path></svg>
					</button>
				</div>
			{/if}
		</div>


		<div class="bottom">
			{#if keyboardControls}
				<div class="zoom">
					<button
						on:click={() => handleZoomClick("in")}
					>zoom in
					</button>
					<button
						on:click={() => handleZoomClick("out")}
					>
						zoom out
					</button>
				</div>
			{/if}
	
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
			{#if viewportWidth > 500}
				<div class="about-keyboard">
					<div class="keyboard-controls">
						<label for="checkbox1"
							><input
								id="checkbox1"
								name="checkbox"
								type="checkbox"
								bind:checked={keyboardControls}
							/> Keyboard Navigation</label
						>
					</div>
					<div class="about">
						<button
							on:click={() => handleAbout()}
						>About
				
						</button>
					</div>
				</div>
			{/if}
		</div>

	</div>
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

{#if screenCoordinates.length > 0 && keyboardControls}
	<div class="screen-coords">

	{#each screenCoordinates as box}
		<div class="screen-coord" style="left:{box.screenPosition[0]}px; top:{box.screenPosition[1]}px; width:{box.screenWidth}px; height:{box.screenWidth}px;">
			<button class="like"
				on:click={(e) => handleKeyboardButtonPress("like",box,e)}
			>
			</button>
			<button class="comment"
				on:click={(e) => handleKeyboardButtonPress("comment",box,e)}
			>
			</button>
			<button class="mag"
				on:click={(e) => handleKeyboardButtonPress("mag",box,e)}
			>
			</button>
		</div>
	{/each}
	</div>
{/if}

{#if mounted && viewportWidth > 500}
	<div class="noise-overlay mounted {skipIntro ? "hide-overlay" : ''}" style="background: url(assets/noise-light.png);">
	</div>
{/if}






<style>
	.screen-coord {
		position: absolute;
	}
	.screen-coords {
		width: 100%;
		height: 100%;
		position: absolute;
		top: 0;
		left: 0;
		pointer-events: none;
		overflow: hidden;
	}
	.screen-coord button {
		pointer-events: all;
		position: absolute;
		border: 1px solid white;
		background: none;
		padding: 0;
		height: 14%;
	}
	.screen-coord .like {
		bottom: 0;
		right: 2%;
		width: 23%;
	}

	.screen-coord .mag {
		top: 0%;
		left: 0%;
		width: 23%;
	}

	.screen-coord .comment {
		bottom: 13%;
		right: 2%;
		width: 23%;
	}

	.noise-overlay.mounted {
		opacity: .3;
	}

	.noise-overlay.hide-overlay {
		display: none;
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
		background: black;
		padding: .5rem 1rem;
	}

	.every-small {
		font-size: 16px;
	}

	.loading-text {
		position: absolute;
		z-index: 100000;
		display: flex;
		width: 100%;
		max-width: calc(100% - 20px);
		left: 0;
		right: 0;
		margin: 0 auto;
		flex-direction: column;
		justify-content: center;
		height: 100%;
		top: 0;
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
	.three-d-close, .maps-link {
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
		width: 100vw;
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
		margin-inline-start: auto;
		margin-top: 1rem;
		margin-right: 1rem;
		position: relative;
	}
	

	.about-keyboard {
		display: flex;
		margin-left: 1rem;
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
		pointer-events: none;
		width: calc(100% - 20px);
		flex-direction: column;
		flex-grow: 1;
		justify-content: space-between;
	}

	.toolbar-logo {
		width: 140px;
		transform:translate(0,5px) rotate(-4deg);
		pointer-events: all;
		height: 50px;
		margin-top: 5px;
		position: absolute;
		top: 1rem;
		left: 1rem;
		margin: 0;
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
		width: 100vw;
		margin: 0 auto;
		justify-content: space-between;
		opacity: 0;
		transform: translate(0,-50px);
		transition: transform .5s, opacity .5s;
		padding: 2rem;
		background: linear-gradient(180deg, black, rgba(0,0,0,0));
		padding-bottom: 6rem;
		width: 100%;
		flex-wrap: wrap;
		height: calc(100% - 20px);
		background: none;
		padding: 0;
		justify-content: flex-start;
		flex-direction: column;
		align-items: center;
	}

	.toolbar:before {
		content: '';
		height: 50px;
		position: absolute;
		width: 100%;
		background: linear-gradient(180deg, black, rgba(0,0,0,0));
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
		width: 100%;
		flex-wrap: wrap;
		margin: 0;
		padding: 10px;
		width: fit-content;
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
		width: 60px;
	}
	.color-finder span.sorted-by {
		margin-left: 20px;
		width: 40px;
		margin: 0;
		margin-right: 10px;
		width: 60px;

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

	.instructions {
		background: #fefca8;
		color: black;
		width: 100px;
		font-family: var(--sans);
		margin-inline-start: auto;
		padding: 5px;
		font-size: 11px;
		position: absolute;
		top: 0px;
		right: 0px;
		margin: 0;
		z-index: 100;
		font-weight: 600;
		pointer-events: none;
		text-transform: uppercase;
	}
	.about {
		background-color: black;
		margin-left: 10px;
		border-radius: 5px;
		pointer-events: all;
		display: flex;
		align-items: center;
	}

	.bottom {
		display: flex;
		flex-wrap: wrap;
	}

	.zoom {
		display: flex;
		width: 100%;
		min-height: 40px;
		margin-bottom: 10px;
	}

	.about button, .zoom button {
		background: black;
		color: white;
		font-size: 12px;
		text-transform: uppercase;
		letter-spacing: .5px;
		padding: 0 1rem;
		height: 100%;
	}

	.zoom button {
		padding: 0rem 1rem;
		margin-right: 10px;
	}

	.maps-link {
		left: 4rem;
	}

	.zoom {
		pointer-events: all;
		z-index: 1000000;
	}

	.helper {
		z-index: 10000;
		position: fixed;
		width: 400px;
		top: 50%;
		padding: 1rem;
		left: 0;
		right: 0;
		margin: 0 auto;
		background-color: rgba(0,0,0,.6);
		border-radius: 5px;
		pointer-events: none;
	}

	.helper p {
		color: white;
		margin: 0 auto;
		font-family: var(--sans);
		font-size: 18px;
		text-align: center;
		text-shadow: -3px -3px 1px rgba(0,0,0, 0.05), -3px -2px 1px rgba(0,0,0, 0.05), -3px -1px 1px rgba(0,0,0, 0.05), -3px 0px 1px rgba(0,0,0, 0.05), -3px 1px 1px rgba(0,0,0, 0.05), -3px 2px 1px rgba(0,0,0, 0.05), -3px 3px 1px rgba(0,0,0, 0.05), -2px -3px 1px rgba(0,0,0, 0.05), -2px -2px 1px rgba(0,0,0, 0.05), -2px -1px 1px rgba(0,0,0, 0.05), -2px 0px 1px rgba(0,0,0, 0.05), -2px 1px 1px rgba(0,0,0, 0.05), -2px 2px 1px rgba(0,0,0, 0.05), -2px 3px 1px rgba(0,0,0, 0.05), -1px -3px 1px rgba(0,0,0, 0.05), -1px -2px 1px rgba(0,0,0, 0.05), -1px -1px 1px rgba(0,0,0, 0.05), -1px 0px 1px rgba(0,0,0, 0.05), -1px 1px 1px rgba(0,0,0, 0.05), -1px 2px 1px rgba(0,0,0, 0.05), -1px 3px 1px rgba(0,0,0, 0.05), 0px -3px 1px rgba(0,0,0, 0.05), 0px -2px 1px rgba(0,0,0, 0.05), 0px -1px 1px rgba(0,0,0, 0.05), 0px 1px 1px rgba(0,0,0, 0.05), 0px 2px 1px rgba(0,0,0, 0.05), 0px 3px 1px rgba(0,0,0, 0.05), 1px -3px 1px rgba(0,0,0, 0.05), 1px -2px 1px rgba(0,0,0, 0.05), 1px -1px 1px rgba(0,0,0, 0.05), 1px 0px 1px rgba(0,0,0, 0.05), 1px 1px 1px rgba(0,0,0, 0.05), 1px 2px 1px rgba(0,0,0, 0.05), 1px 3px 1px rgba(0,0,0, 0.05), 2px -3px 1px rgba(0,0,0, 0.05), 2px -2px 1px rgba(0,0,0, 0.05), 2px -1px 1px rgba(0,0,0, 0.05), 2px 0px 1px rgba(0,0,0, 0.05), 2px 1px 1px rgba(0,0,0, 0.05), 2px 2px 1px rgba(0,0,0, 0.05), 2px 3px 1px rgba(0,0,0, 0.05), 3px -3px 1px rgba(0,0,0, 0.05), 3px -2px 1px rgba(0,0,0, 0.05), 3px -1px 1px rgba(0,0,0, 0.05), 3px 0px 1px rgba(0,0,0, 0.05), 3px 1px 1px rgba(0,0,0, 0.05), 3px 2px 1px rgba(0,0,0, 0.05), 3px 3px 1px rgba(0,0,0, 0.05);
	}

	.waiting {
		width: 100%;
		height: 100%;
		z-index: 1000000;
		position: fixed;
		display: flex;
		flex-direction: column;
		justify-content: center;
		background: rgba(0, 0, 0, .7);
		pointer-events: none;
		cursor: help;
		pointer-events: all;
	}

	.waiting .every {
		color: white;
		font-family: var(--sans);
		font-size: 18px;
		text-align: center;
	}

	.finger {
		width: 40px;
		margin: 0 auto;
		margin-top: 10px;
		animation: swipe 2s;
		animation-iteration-count: infinite;
	}

	.keyboard-controls {
		color: white;
		background-color: black;
		font-family: var(--sans);
		pointer-events: all;
		width: fit-content;
		display: flex;
		flex-direction: column;
		justify-content: center;
		padding: 0 1rem;
		border-radius: 5px;
	}

	.location-queried {
		position: absolute;
		top: 45px;
		left: 0;
		width: 100%;
		box-shadow: 0 10px 2px rgba(0,0,0,.1);
	}

	.location-queried button {
		max-width: 100%;
		width: 100%;
		background-color: #c4c4c4;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 14px;
		font-weight: 500;
		border-radius: 3px;
	}

	.location-queried button svg {
		margin-left: 12px;
		width: 10px;
		height: 10px;
	}

	.keyboard-controls label {
		background: black;
		color: white;
		font-size: 11px;
		user-select: none;
		text-transform: uppercase;
		letter-spacing: .5px;
		display: flex;
	}

	.keyboard-controls label input {
		margin-right: 5px;
	}

	@keyframes swipe {
  		0% {
			transform: translate(0,0%);
		}
		20% {
			transform: translate(-10%,0%);
		}
		40% {
			transform: translate(10%,0%);
		}
		80% {
			transform: translate(0%,10%);
		}
  		100% {
			transform: translate(0,0%);
		}
	}

		
	@media only screen and (max-width: 640px) {
		.location-queried {
			top: 47px;
		}
	}
	@media only screen and (max-width: 900px) {
		.geocoder {
			margin-top: 70px;
		}
		.color-finder {
			width: 300px;
		}
		.color-finder button {
			min-width: 25px;
		}
		.geocoder {
			display: flex;
			margin-top: 1rem;
			justify-content: flex-end;
		}
		
		.about-keyboard {
			margin-top: 10px;
			margin-left: 0px;
		}
		.color-finder span.sorted-by {
			margin-top: 10px;
		}
		.bottom {
			flex-wrap: wrap;
			max-width: 500px;
		}
		.zoom {
			width: 300px;
		}
		.sort-buttons {
			margin-top: 10px;
		}
		.zoom button {
			padding: .5rem 1rem;
		}
		.about button {
			padding: .5rem .5rem;
		}
	}

	@media only screen and (max-width: 500px) {
		.loading-start {
			justify-content: flex-end;
		}
		.loading-start .every {
			margin-bottom: 100px;
		}
		.geocoder {
			margin: 0 auto;
			margin-top: 70px;
		}
		.toolbar-logo {
			margin: 0 auto;
			left: 0;
			right: 0;
		}
		.every-small, .every {
			background-color: black;
		}
		.every-small span, .every span {
			background: none;
		}
	}

</style>
