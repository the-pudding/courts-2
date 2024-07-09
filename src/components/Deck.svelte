<script>
	import { onMount } from "svelte";
	import { easeCubic, index, format } from "d3";
	import filterLocation from '$actions/filterAddresses.js'
	import colorSort from "$actions/colorSort.js";
	import courtData from "$data/data.csv";
	import {Deck, OrthographicView, OrthographicViewport, COORDINATE_SYSTEM, LinearInterpolator} from '@deck.gl/core';
	import {IconLayer, BitmapLayer, TextLayer} from '@deck.gl/layers';
	import {TileLayer} from '@deck.gl/geo-layers';
	import { fly } from 'svelte/transition';
	import ThreeD from "$components/ThreeD.svelte"
	
	import Comment from "$components/Comment.svelte"

	import {
		isCommenting, isThreeD
	} from "$stores/misc.js";

	import {
		countFaves
	} from "$utils/supabase.js";

	import MapboxGeocoder from '@mapbox/mapbox-gl-geocoder';
	import '@mapbox/mapbox-gl-geocoder/dist/mapbox-gl-geocoder.css';

	import {load, setLoaderOptions, registerLoaders} from '@loaders.gl/core';
	
	export let viewportHeight;
	export let viewportWidth;

	import {
		BasisLoader,
	} from '@loaders.gl/textures';

	
	$: console.log(zoom)
	let formatComma = format(",");
	let screenCoordinates = [];
	let el;
	let zoom = -1.5;
	let tileLayerZoom = 3.9;
	let targetDeck;
	let deckgl;
	let dummy;
	let favoritedCourt;
	let bounds;
	let inputBox;
	let spritePositionsMaster;
	let commentId;
	let commentNode;
	let filteredIds = [];
	let threeDId;
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

		let squareSize = Math.floor(Math.sqrt(spritePositionsMaster.length));
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

			let x = (i % squareSize) * 5 + (i % squareSize)*.1// + Math.random()*1;
			let y = Math.floor(i/squareSize) * 5 + Math.floor(i/squareSize)*1*.1// + Math.random() * 1;

			return {
				"coordinates":[x,y],
				id:id,
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
			getSize: 5,
			sizeUnits: 'common',
			iconMapping: iconMapping,
			iconAtlas:`assets/toolbar-3.png`,
			transitions: {
				getPosition: {
					duration: 1000,
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
			
			if(+item.id == 22148967){
				console.log(item)
			}

			textData.push({
				text: `${item.location}, ${item.state}`,
				position: [item.coordinates[0]-2.4, item.coordinates[1]+2.2],
				size:.4
			})

			textData.push({
				text: likes,
				position: [item.coordinates[0]-2.5+5-.45, item.coordinates[1]+2.5-.31],
				size:.33
			})

			textData.push({
				text: comments,
				position: [item.coordinates[0]-2.5+5-.45, item.coordinates[1]+2.5-.93],
				size:.33
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
				getSize: 5,
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
		dummy = true;

		await Promise.all(states.slice(0,1).map(async d => {
			await getTexture(d);
        }))

		texturesLoaded = true;
		return true;
	}
	
	async function assignDataToIconLayers(){
		for (let layer in layerProps){
			let dataTobind = spritePositionsMaster.filter(d => d.geo == states[layer]);
			console.log(dataTobind)
			layerProps[layer].data = dataTobind;
		}
		return true;
	}

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
						// console.log(props)
						props.data[image].tileId = props.id;
						// renderedSublayers.push(props.data[image]);
						let likes = JSON.stringify(props.data[image].likes);
						let comments = JSON.stringify(props.data[image].comments);
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
						let top = imageCoors[1]+1;


						left = imageCoors[0]-2.5;
						bottom = imageCoors[1]+5-2.49;
						right = imageCoors[0]+5-2.5;
						top = imageCoors[1]-2.5;
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

						const itemTwo = new BitmapLayer(props,{
							image: `assets/toolbar-3.png`,
							id: `${props.id}_${imageId}_bitmap2`,
							bounds: [[left, bottom], [left, top], [right, top], [right, bottom]],//[0,5,5,0]
							visible: zoom > tileLayerZoom,
						})

						const TEXT_DATA = [
							{
								text: imageName,
								position: [imageCoorsFinal[0]+.1, imageCoorsFinal[1]-.19],
								size:.33
							},
							{
								text: comments,
								position: [imageCoorsFinal[0]+5-.45, imageCoorsFinal[1]-.93],
								size: .33
							},
							{
								text: likes,
								position: [imageCoorsFinal[0]+5-.45, imageCoorsFinal[1]-.31],
								size: .33
							}
						];

						const textLayer = new TextLayer(props, {
							data: TEXT_DATA,
							id: `TextLayer-${imageId}-${props.id}`,
							getPosition: d => d.position,
							getText: d => {
								return d.text;
								return JSON.stringify(courtsFaveCount[0])//'d.text,
							},	
							//characterSet: 'auto',
							fontFamily: "-apple-system,BlinkMacSystemFont,Helvetica,Arial,sans-serif",
							getAlignmentBaseline: 'center',
							getColor: [255, 255, 255],
							getSize: d => d.size,
							// background: true,
							// getBackgroundColor: [0,0,0],
							getTextAnchor: 'start',
							sizeUnits: 'common',
							visible: zoom > tileLayerZoom,
							// updateTriggers: {
							// 	getText: courtsFaveCount
							// }
						});

						const ICON_DATA = [
							{
								position: [imageCoorsFinal[0]+5-.5, imageCoorsFinal[1]-.5],
								color: [255, 0, 0],
							}
						];


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
			return viewport.project([coords[0]-2.5,coords[1]-2.5]);
		}
		else {
			return [0,0];
		}
  	}


  	function updateScreenCoordinates(viewport) {
		screenCoordinates = renderedSublayers.map(d => {
			let pos = getScreenCoordinates(d.coordinates,viewport);
			let width = getScreenCoordinates([10,0],viewport)[0]-getScreenCoordinates([5,0],viewport)[0];
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

		await new Promise(async(resolve, reject) => {    	
			supaBaseData = index(await countFaves(), d => d.court_id);
			resolve(supaBaseData);
		})
		.then((result) => {						
        	console.log(result);
    	})

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
		console.log(spriteMap)


		await makeIconLayersProps();
		await assignDataToIconLayers()
		await makeIconLayers();


		console.log(layers)

		const geocoder = new MapboxGeocoder({
			accessToken: 'pk.eyJ1IjoiZG9jazQyNDIiLCJhIjoiY2x5YzVlcXZ4MW1qajJsb3RoeWI0bzhmZyJ9.DY653tAkLZCDMMEPuFvoGA',
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

		geoCoderAdded = true;

		deckgl = new Deck({
			parent: el,
			views: new OrthographicView(),
		    initialViewState: { 
				target: [100, 100, 0],
				zoom: zoom,
				transitionInterpolator: new LinearInterpolator(['zoom']),
			    transitionDuration: 'auto'
			},
			onClick: ({x,y}) => {

				let selected = screenCoordinates.filter(d => {

					let box = [d.screenPosition[0],d.screenPosition[0]+d.screenWidth,d.screenPosition[1], d.screenPosition[1] + d.screenWidth];
					return (box[0] < x && box[1] > x) && (box[2] < y && y < box[3])
				})

				console.log(x,y,selected.length,screenCoordinates,renderedSublayers,selected)

				if(selected.length > 0){
					let image = selected[0];
					let xPercent = (x-image.screenPosition[0])/image.screenWidth;
					let yPercent = (y-image.screenPosition[1])/image.screenWidth;

					console.log(xPercent,yPercent)
					if(xPercent > .79){
						console.log("valid")
						if(yPercent > .89){
							updateFromHeartClick(image.id,image);							
						}
						else if(yPercent > .75){
							console.log("comment")
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

				deckgl.setProps({viewState});
  			},
			controller: true,
			layers: layers
		});
	})

	function zoomTo(zoomLevel){
		return new Promise((resolve, reject) => {
			const interpolator = new LinearInterpolator(['zoom']);

			deckgl.setProps({
				views: new OrthographicView(),
				initialViewState: {
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


	async function updateFromHeartClick(id,image){
		console.log(image)
		courtsWithFavorites[id] = (courtsWithFavorites[id] || 0) + 1;
		courtsFaveCount = [courtsFaveCount[0] + 1];
		courtsFaveCount = [...courtsFaveCount];

		favoritedCourt = `#${formatComma(image.info.court_count)} in ${image.info.location}, ${image.info.state}`

		spritePositionsMaster = await makeMasterData(filteredIds,courtData);
		console.log(courtsWithFavorites)

		// let textData = await makeTextData();
		// textLayer.data = [...textData];
		await loadText();
		
		deckgl.setProps({
			layers: layers.concat([firstTileLayer,iconAtlasLayer,textLayer])
		});

		favoriteActive = true;

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
		await assignDataToIconLayers()
		await makeIconLayers();
		await makeTileLayer();

		deckgl.setProps({
			layers: layers
		});


		// if(zoom == -1.5){
		// 	deckgl.setProps({
		// 		layers: layers
		// 	});	
		// }
		// else {
		// 	await zoomTo(-1.5);
		// 	// await zoomTo(2.8)
		// 	deckgl.setProps({
		// 		layers: layers
		// 	});

		// 	setTimeout(()=> {
		// 		zoomTo(2.8);
		// 	},2000)
		// }
	}


	function sortImages(locationData){
		return new Promise((resolve, reject) => {
        	filteredIds = filterLocation(courtData,locationData,"bbox");
			if(filteredIds.length == 0){
				filteredIds = ["none"]
			}
			spritePositionsMaster = makeMasterData(filteredIds,courtData);
			console.log(spritePositionsMaster)
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

<div class="loading-overlay" style="display:{deckAdded ? "none" : ''};">
	{#if supaBaseData}
		<p>Supabase Loaded</p>
	{/if}
	{#if spritePositionsMaster}
		<p>Sprite Positions Loaded</p>
	{/if}
	{#if dummy}
		<p>Dummy Basis Loaded</p>
 	{/if}

	{#if texturesLoaded}
		<p>Textures Loaded</p>
  	{/if}

	{#if geoCoderAdded}
		<p>Geocoder Loaded</p>
	{/if}
	{#if deckAdded}
		<p>Deck Added</p>
	{/if}
</div>


<div class="overlay" id="overlay">
	{#if $isCommenting == true}
		<Comment {commentId} on:formSubmit={handleCommentSubmit} />
	{/if}
	
	<div bind:this={inputBox} id="geocoder" class="geocoder">
	</div>

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

	<!-- <button on:click={() => sortColor(courtData)}>sort</button> -->
</div>

<div class="el" bind:this={el}>
</div>

<div class="favorite-text" class:favoriteActive>
	{#key favoritedCourt}
		<p in:fly={{duration:1000,y:20,delay:0}}>Like Added to Court {favoritedCourt}</p>
	{/key}
</div>

{#if spritePositionsMaster}
	<div class="search-results">
		<p>{formatComma(spritePositionsMaster.length)} courts</p>
	</div>
{/if}



<style>
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
	.favorite-text {
		position: absolute;
		top: 0;
		left: 0;
		z-index: 1000;
		background-color: rgba(0,0,0,.8);
		width: 100%;
		height: 100%;
		opacity: 0;
		pointer-events: none;
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
		animation: fadeInOut;
		animation-duration: 4s;
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
		background-color: red;
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
		margin-top: 20px;
		margin-left: 20px;
	}

    .el {
        width: 100%;
		height: 100%;
		position: absolute;
		top: 0;
		left: 0;
    }
</style>
