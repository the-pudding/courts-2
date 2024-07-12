<script>


    import {geoGraticule10, geoPath, geoOrthographic, scalePow, geoProjection, interpolateNumberArray, interpolateNumber} from "d3"
	import { feature } from 'topojson-client';
    import { tweened } from "svelte/motion";
    import { Versor } from '$actions/Versor.js';
    import { onMount } from "svelte";
	import { cubicInOut } from "svelte/easing";

	import shuffle from "$actions/shuffle.js";
	import viewport from "../stores/viewport";
	import { createEventDispatcher } from 'svelte';

	const dispatch = createEventDispatcher();

    export let sizes;
    export let geoJSON;
    export let courtData;
    export let viewportHeight;
    export let viewportWidth;

    let dotScale = scalePow().domain([.2,1]).range([0,1]).exponent(10).clamp(true);
    
    let rotateScale = scalePow().domain([0,1]).range([3,1]).exponent(.5).clamp(true);

    shuffle(courtData)
    
    let duration = 10000;
    let newData = courtData.map(d => {
            // let center = d.center.split(",");
            return d.latLong;//[+center[0],+center[1]];
        })//.slice(0,100);

	$: projection = geoOrthographic()
        .fitWidth(viewportHeight, sphere)
		.rotate([110*rotateScale($tween), -40])
        .translate([viewportWidth,viewportHeight])
        .scale(1000*(Math.max(($tween*1.5),.1)))
        .precision(0);

	const sphere = { type: 'Sphere' };

	$: land = geoJSON ? feature(geoJSON, geoJSON.objects.land) : null;
	
    let tween = tweened(0, {
		duration: duration,
        easing: cubicInOut
	});

    let cartTween = tweened(0, {
		duration: 2000,
        easing: cubicInOut
	});

    function cartesianProjection(lambda, phi) {
        return [lambda, phi];
    }

    const projectionCart = geoProjection(cartesianProjection)
            .fitWidth(viewportWidth*2, sphere)
            .scale(1000)

    $: path = geoPath(projection).pointRadius(2);

    $: path, render()

	$: render = () => {

        if(context){

            context.clearRect(0, 0, viewportWidth*2, viewportHeight*2);
            
            if(globeFinished){


                context.fillStyle = `rgba(54,53,49,${1-$cartTween})`;
                context.beginPath();
                path.context(context);
                path(land);
                context.fill();

                context.fillStyle = '#7d6a51'; // Color for the points

                courtData.forEach((d,i) => {
                    let interpolate = interpolateNumberArray(projection(newData[i]),d.coordinates.map(d => d*2))
                    let interpolateSize = interpolateNumber(1.5/2,sizes.size*2)

                    let transitionVal = interpolate($cartTween);
                    let sizeRect = interpolateSize($cartTween);
                    context.beginPath();
                    context.rect(transitionVal[0], transitionVal[1], sizeRect, sizeRect)

                    // context.arc(transitionVal[0], transitionVal[1], sizes.size, 0, Math.PI * 2, true); // Draw a circle for each point
                    context.fill();
                });
            }
            else {
                context.fillStyle = "rgba(12,12,11,1)"
                context.beginPath();
                path.context(context);
                path(sphere);
                context.fill();


                context.fillStyle = "rgba(54,53,49,1)"
                context.beginPath();
                path.context(context);
                path(land);
                context.fill();

                context.fillStyle = "#7d6a51";
                context.beginPath();


                path.context(context);
                path({type: "MultiPoint", coordinates: newData.slice(0,Math.floor(newData.length*(dotScale($tween))))});
                context.fill();
            }

        }
    }

    let globeFinished;
    let canvas;
    let context;
    let path1;
    let path2;
    let introFinished;

    onMount(() => {
        context = canvas.getContext("2d");

        tween.set(1).then(() => {
            globeFinished = true;
            console.log("here")

            cartTween.set(1).then(() => {
                introFinished = true;
                dispatch('finished', {
			        text: 'Hello!'
		        });
            })
            
            render();
        });


    })
    
</script>
{#if newData}
    <div class="canvas-container" class:introFinished>
        <canvas
            bind:this={canvas} 
            width={viewportWidth*2} height={viewportHeight*2}
            style="width:{viewportWidth}px;height:{viewportHeight}px;opacity:{Math.max($tween,1)};"
        >
        </canvas>
    </div>



    <!-- <svg width={1000} height={1000} viewBox="0 0 {1000} {1000}">
        <g>
            <path class="sphere" d={path(sphere)} />
            <path style="fill:white; stroke:none;" class="land" d={path(land)} />
            <path style="fill:red; stroke:none;" class="cities" d={path({type: "MultiPoint", coordinates: newData})} />
        </g>
    </svg> -->
{/if}


<style>
    .canvas-container {
        margin: 0 auto;
        position: relative;
        width: 100%;
        height: 100%;
        transition: opacity 1s;
    }
    .introFinished {
        opacity: 0;
    }
    canvas {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        margin: 0 auto;
        transform: translate(0,-50%);
        top: 50%;
    }
</style>