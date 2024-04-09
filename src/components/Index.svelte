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

	let ICON_MAPPING = {
	  marker: {x: 0, y: 0, width: 128, height: 128, mask: false}
	};
	let spriteMap = sprite.map(d => {
		return {x:+d.x, y:+d.y, width:128, height: 128, mask: false, id:d.id.replace(".jpg","")};
	});

	const spriteObject = {};

	for (let row of spriteMap) {
		spriteObject[row.id] = row;
	}

	let data = shuffle(sprite);

	data = data.map((d,i) => {
		let x = (i % 25) * 5 + (i % 25) + Math.random()*1;
		let y = Math.floor(i/25) * 5 + Math.floor(i/25)*1 + Math.random() * 1;
		return {"coordinates":[x,y], id:d.id.replace(".jpg","")}
	});

	// data = range(10000).map((d,i) => {
	// 	let x = (i % 100) * 5 + (i % 100);
	// 	let y = Math.floor(i/100) * 5 + Math.floor(i/100)*1;
	// 	return {"coordinates":[x,y], id:"new_0"}
	// })

	// data.push({"coordinates":[-88,-56], id:"new_0"})

	$: bounds ? renderLayers() : null;

	let highResData = [];
	let drawTimeout;

	function renderLayers(){
		console.log("rendering")
		console.log(bounds)
		highResData = [];

		if(drawTimeout){
			clearTimeout(drawTimeout);
		}

		if(zoom > 5){
			highResData = data
				.filter(d => {
					let x = d.coordinates[0];
					let y = d.coordinates[1];

					console.log(x,y)
					//[minX, minY, maxX, maxY]
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
								id: `users_${zoom}`,
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
		console.log(highResData)

	}

	function errorMessage(error){
		console.log(error)
	}


	async function getData(bbox, id) {
  	// Stall for 20ms - simulate an async request
  		await new Promise(resolve => setTimeout(resolve, 20));
		let highResData = data
			.filter(d => {
				let x = d.coordinates[0];
				let y = d.coordinates[1];
				if(x >= bbox.left && x <= bbox.right && y >= bbox.top && y <= bbox.bottom){
					return d;
				}
			})

		// console.log(highResData)
		console.log(bbox)

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

			// new TileLayer({
      		// 	tileSize: 256,
			// 	coordinateSystem: COORDINATE_SYSTEM.CARTESIAN,
			// 	// data: 'https://c.tile.openstreetmap.org/{z}/{x}/{y}.png',

      		// 	// extent: [0, 0, 1422, 905],
      		// 	getTileData: async ({id, bbox}) => {
        	// 		return await getData(bbox, id);
      		// 	},
			// 	renderSubLayers: props => {

			// 		const {
        	// 			bbox: {left, bottom, right, top}
      		// 		} = props.tile;

			// 		return [
			// 			new BitmapLayer(props, {
			// 			data: null,
			// 			image: 'assets/box.png',
			// 			id: `${props.id}_bitmap`,
			// 			bounds: [left, bottom, right, top]
			// 		}),
			// 		new IconLayer({
			//             data: props.data,
			// 			id: `${props.id}_icon`,
			// 			getIcon: d => d.id,
			// 			getPosition: d => d.coordinates,
			// 			getSize: 5,
			// 			iconAtlas: 'assets/spritesheet_128.jpeg',
			// 			iconMapping: spriteObject,
			// 			sizeUnits: 'common'
			// 		})
			// 		]
			// 	}
			// })



				new IconLayer({
						id: 'IconLayer',
						data: data.slice(0,500),
						// getIcon: d => d.id,
						getIcon: d => ({
							url: `assets/small/${d.id}.jpg`,
							width: 128,
							height: 128,
							mask: false
						}),
						getPosition: d => d.coordinates,
						getSize: 5,
						// iconAtlas: 'assets/spritesheet_128.jpeg',
						// iconMapping: spriteObject,
						
						sizeUnits: 'common'
				})
			]
		});

	})


</script>


<!-- <WIP /> -->
<!-- <Demo /> -->
<!-- <Footer /> -->
