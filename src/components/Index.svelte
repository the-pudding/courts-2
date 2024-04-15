<script>
	import { getContext, onMount } from "svelte";
	import { range } from "d3";
	import Demo from "$components/demo/Demo.svelte";
	import WIP from "$components/helpers/WIP.svelte";
	import sprite from "$data/sprite-data_128.csv"
	// import Footer from "$components/Footer.svelte";

	// const copy = getContext("copy");
	// const data = getContext("data");


	import {Deck, OrthographicView, COORDINATE_SYSTEM} from '@deck.gl/core';
	// import {ScatterplotLayer} from '@deck.gl/layers';
	import {IconLayer, BitmapLayer} from '@deck.gl/layers';
	import {TileLayer} from '@deck.gl/geo-layers';
	import Dice_3 from "lucide-svelte/icons/dice-3";

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

	let zoom;
	let deckgl;
	let bounds;
	// $: bounds ? renderLayers() : null;

	let width = 128;//2304;//128;
	let height = 128;//2176;//128;

	// let ICON_MAPPING = {
	//   marker: {x: 0, y: 0, width: width, height: height, mask: false}
	// };
	let spriteMap = sprite.map(d => {
		return {x:+d.x, y:+d.y, width:width, height: height, mask: false, id:d.id.replace(".jpg","").replace(".jpeg","")};
	});



	const spriteObject = {};

	for (let row of spriteMap) {
		spriteObject[row.id] = row;
	}

	let data = shuffle(sprite);

	data = data.map((d,i) => {
		let x = (i % 25) * 5 + (i % 25)*.1// + Math.random()*1;
		let y = Math.floor(i/25) * 5 + Math.floor(i/25)*1*.1// + Math.random() * 1;
		return {"coordinates":[x,y], id:d.id.replace(".jpg","")}
	});

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

		let highResData = data
			.filter(d => {
				let x = d.coordinates[0];
				let y = d.coordinates[1];
				if(x >= bbox.left && x <= bbox.right && y >= bbox.top && y <= bbox.bottom){
					return d;
				}
			})

		return highResData

	}

	onMount(async () => {
		deckgl = new Deck({
			views: new OrthographicView(),
		    initialViewState: { target: [0, 0, 0], zoom: 5 },
			onViewStateChange: ({viewState}) => {
		    	// console.log( viewState );
				// let viewport = new Viewport({width: 500, height: 500, viewMatrix, projectionMatrix, ...});
				let width = 1422;
				let height = 905;
				const view = new OrthographicView(viewState.main);
				let viewport = view.makeViewport({width, height, viewState})
				bounds = viewport.getBounds();
				zoom = viewport.zoom;
				// console.log(zoom)
  			},
			controller: true,
			layers: [


			// WORKING ICON LAYER
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


			new TileLayer({
      			tileSize: 512,
				coordinateSystem: COORDINATE_SYSTEM.CARTESIAN,
				// data: 'https://c.tile.openstreetmap.org/{z}/{x}/{y}.png',

      			// extent: [0, 0, 1422, 905],
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

					// console.log(props.id,props.data[0])
					let layers = [
					]
					// console.log(props.id)
					if(props.data && props.data.length > 0){

						for (let image in props.data){

							let imageId = props.data[image].id;
							let imageCoors = props.data[image].coordinates;
							let imageCoorsFinal = [imageCoors[0]-2.5,imageCoors[1]+5-2.5,imageCoors[0]+5-2.5,imageCoors[1]-2.5];

							let item = new BitmapLayer(props,{
								image: `assets/${imageId}.jpeg`,
								id: `${props.id}_${image}_bitmap`,
								bounds: imageCoorsFinal,//[0,5,5,0]
								visible: zoom > 5
							})

							layers.push(item);

						}
					}

					// let outline = new BitmapLayer(props,{
					// 		image: `assets/box.png`,
					// 		id: `${props.id}_outline`,
					// 		bounds: [left,bottom,right,top]
					// 	})

					// layers.push(outline);


					// [left, bottom, right, top]
					return layers //[
						// new BitmapLayer(props, {
						// 	//data: null,
						// 	image: `assets/${imageId}.jpeg`,
						// 	id: `${props.id}_bitmap`,
						// 	bounds: imageCoorsFinal//[0,5,5,0]
						// }),

						// new IconLayer({
						// 	data: props.data,
						// 	id: `${props.id}_icon`,
						// 	getIcon: d => d.id,
						// 	getPosition: d => d.coordinates,
						// 	getSize: 5,
						// 	iconAtlas: 'assets/spritesheet_128.jpeg',
						// 	iconMapping: spriteObject,
						// 	sizeUnits: 'common',
						// 	visible: zoom > 5
						// })
					//]
				}
			}),



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
			]
		});

	})


</script>


<!-- <WIP /> -->
<!-- <Demo /> -->
<!-- <Footer /> -->
