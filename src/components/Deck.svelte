<script>
	import { getContext, onMount } from "svelte";
	import { range, sort } from "d3";
	import filterLocation from '$actions/filterAddresses.js'
	import colorSort from "$actions/colorSort.js";
	import courtData from "$data/data.csv";//"$data/court_data.csv"

	import {Deck, OrthographicView, COORDINATE_SYSTEM} from '@deck.gl/core';
	import {IconLayer, BitmapLayer} from '@deck.gl/layers';
	import {TileLayer} from '@deck.gl/geo-layers';

	import MapboxGeocoder from '@mapbox/mapbox-gl-geocoder';
	import '@mapbox/mapbox-gl-geocoder/dist/mapbox-gl-geocoder.css';
	import SortTable from "./helpers/SortTable.svelte";
	import { LucideAsterisk } from "lucide-svelte";

	import {load, setLoaderOptions} from '@loaders.gl/core';

	// import { basis } from '@loaders.gl/core';
	
	import {
		BasisLoader,
	} from '@loaders.gl/textures';


	// setLoaderOptions({
	// 	modules: {
	// 		BasisLoader
	// 	}
	// });



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
			return {"coordinates":[x,y], id:d.id.replace(".jpg",""), "geo": d.geo};
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
			console.log(test)
		}
		return test;
	}

	function getTexture(state){
		return new Promise(async (resolve, reject) => {

			let options = {
				'basis': {
					format: "etc1",//"astc-4x4",
					//'CDN':false,
					//'useLocalLibraries':true,
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

			const result = await load(`assets/${state}.basis`, BasisLoader, options);
			const image = result[0]//.filter((d,i) => i < 1);
			console.log(image)
			let texture = {
				data: image,
				width: 4096,
				height: 4096,
				compressed: true,
			}

			layerProps[state].iconAtlas = texture;
			resolve();
		})

	}

	async function makeIconLayersProps(){
		for (let state of states){
			let props = {
				id: `IconLayer_${state}`,
				getIcon: d => d.id,
				getPosition: d => d.coordinates,
				getSize: 5,
				//iconAtlas: `assets/spritesheet_128_${state}.jpeg`,
				iconMapping: spriteMap[state],
				sizeUnits: 'common',
				transitions: {
					getPosition: {
						duration: 300,
					}
				}
			};
			layerProps.push(props);
		}



		await Promise.all(states.map(async d => {
            await getTexture(d);
        }));


		// for (let state in states){
		// 	const result = await load(`assets/${states[state]}.basis`, BasisLoader, options);
		// 	const image = result[0]//.filter((d,i) => i < 1);
		// 	console.log(image)
		// 	let texture = {
		// 		data: image,
		// 		width: 4096,
		// 		height: 4096,
		// 		compressed: true,
		// 	}

		// 	layerProps[state].iconAtlas = texture;
		// }
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
			tileSize: 512,
			coordinateSystem: COORDINATE_SYSTEM.CARTESIAN,
			getTileData: async ({id, bbox}) => {
				console.log(zoom)
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

					for (let image in props.data){

						let imageId = props.data[image].id;
						let imageCoors = props.data[image].coordinates;
						// let imageCoorsFinal = [imageCoors[0],imageCoors[1],imageCoors[0],imageCoors[1]];
						let imageCoorsFinal = [imageCoors[0]-2.5,imageCoors[1]+5-2.5,imageCoors[0]+5-2.5,imageCoors[1]-2.5];

						let item = new BitmapLayer(props,{
							image: `https://s3.amazonaws.com/pudding.cool/projects/courts/png/${imageId}.png`,
							id: `${props.id}_${imageId}_bitmap`,
							bounds: imageCoorsFinal,//[0,5,5,0]
							visible: zoom > 5
						})

						layers.push(item);

					}
				}

				let outline = new BitmapLayer(props,{
						image: `assets/box.png`,
						id: `${props.id}_outline`,
						bounds: [left,bottom,right,top]
					})

				// layers.push(outline);
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

	function renderLayers(){
		console.log("rendering","zoom:",zoom)
		// console.log(bounds)
		highResData = [];

		if(drawTimeout){
			clearTimeout(drawTimeout);
		}

		if(zoom > 5){
			highResData = data
				.filter(d => {
					let x = d.coordinates[0];
					let y = d.coordinates[1];

					if(x > bounds[0] && x < bounds[2] && y > bounds[1] && y < bounds[3]){
						return d;
					}
				})


			drawTimeout = setTimeout(() => {
				deckgl.setProps(
					{
						layers: [
							new IconLayer({
								id: 'IconLayer',
								data,
								getIcon: d => d.id,
								getPosition: d => d.coordinates,
								getSize: 5,
								iconAtlas: 'assets/spritesheet_128.jpeg',
								iconMapping: spriteObject,
								sizeUnits: 'common'
							}),
							new IconLayer({
								id: `users_${zoom}_${bounds[0]}`,
								data: highResData,
								getIcon: d => ({
									url: `assets/${d.id}.jpeg`,
									width: 500,
									height: 500,
									mask: false
								}),
								getSize: 5,
								getPosition: d => d.coordinates,
								sizeUnits: 'common',
								onIconError: e => {
      								console.log(e)
    							}
								//visible: zoom > 5
							})

						]
					}
				);
			},100)
		}
		// console.log(highResData)

	}

	function errorMessage(error){
		console.log(error)
	}


	async function getData(bbox, id) {
  	// Stall for 20ms - simulate an async request
  		// await new Promise(resolve => setTimeout(resolve, 100));
		if(!courtData){
			return [];
		}

		let highResData = spritePositionsMaster
			.filter(d => {
				let x = d.coordinates[0];
				let y = d.coordinates[1];
				if(x >= bbox.left && x <= bbox.right && y >= bbox.top && y <= bbox.bottom){
					return d;
				}
			})

		// console.log(highResData)

		return highResData
	}

	onMount(async () => {

		spritePositionsMaster = await makeMasterData([],courtData);
		spriteMap = await makeSpriteObject();
		await makeIconLayersProps();
		await assignDataToIconLayers()
		await makeIconLayers();
		await makeTileLayer();

		// layers = [];


		const geocoder = new MapboxGeocoder({
			accessToken: 'pk.eyJ1IjoiZG9jazQyNDIiLCJhIjoiY2xqc2g3N2o5MHAyMDNjdGhzM2V2cmR3NiJ9.3x1ManoY4deDkAGBuUMnSw',
			options: {
				marker: false
			}
		});
		geocoder.addTo(inputBox)
		// console.log(inputBox)

		// inputBox.appendChild("#geocoder");

		geocoder.on('result', e => {
    		sortImages(e);
		});

		deckgl = new Deck({
			parent: el,
			views: new OrthographicView(),
		    initialViewState: { target: [100, 100, 0], zoom: zoom },
			onViewStateChange: ({viewState}) => {
				let width = 1240;
				let height = 903;
				const view = new OrthographicView(viewState.main);
				let viewport = view.makeViewport({width, height, viewState})
				bounds = viewport.getBounds();
				zoom = viewport.zoom;
				// console.log(zoom,bounds)
  			},
			controller: true,
			layers: layers
			// [
				// new BitmapLayer({
				// 	image: texture,
				// 	id: `_bitmap`,
				// 	bounds: [50,100,100,50]//[0,5,5,0]
				// }),
			

			// basis
			// new IconLayer({
			// 	id: 'IconLayer',
			// 	getIcon: d => d.id,
			// 	getPosition: d => d.coordinates,
			// 	getSize: 5,
			// 	iconAtlas: texture,
			// 	// loaders: [BasisLoader],
			// 	// iconAtlas: 'assets/spritesheet_128.jpeg',
			// 	iconMapping: spriteObject,
			// 	sizeUnits: 'common',
			// }),

			// // WORKING ICON LAYER




			// // WORKING ICON LAYER
			// new IconLayer({
			// 	id: 'IconLayer',
			// 	data,
			// 	getIcon: d => d.id,
			// 	getPosition: d => d.coordinates,
			// 	getSize: 5,
			// 	iconAtlas: 'assets/spritesheet_128.jpeg',
			// 	iconMapping: spriteObject,
			// 	sizeUnits: 'common'
			// }),





				// new IconLayer({
				// 		id: 'IconLayer',
				// 		data: data,
				// 		// getIcon: d => d.id,
				// 		// getIcon: d => ({
				// 		// 	url: `assets/small/${d.id}.jpg`,
				// 		// 	width: 128,
				// 		// 	height: 128,
				// 		// 	mask: false
				// 		// }),
				// 		getPosition: d => d.coordinates,
				// 		getSize: 5,
				// 		iconAtlas: 'assets/spritesheet_128.jpeg',
				// 		iconMapping: spriteObject,
				// 		sizeUnits: 'common'
				// })
			// ]
		});

	})

	async function sortImages(locationData){
		
        let ids = filterLocation(courtData,locationData,"bbox");
		
		spritePositionsMaster = await makeMasterData(ids,courtData);

		await assignDataToIconLayers()
		await makeIconLayers();

		deckgl.setProps({
			layers: layers
		});
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
        width: 100%;
		height: 100%;
		position: absolute;
		top: 0;
		left: 0;
    }
</style>
