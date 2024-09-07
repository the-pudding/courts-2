

  <script>
    import { onMount } from "svelte";
    // import { Viewer, Cesium3DTileset, Math, Cartesian3, Matrix4 } from 'cesium'
    const GoogleKey = import.meta.env.VITE_GOOGLE;

    export let coords;
    let mounted = false;
    let loaded = false;


    $: console.log(coords)

    function loadCesium() {

        console.log("playing")
        const viewer = new Cesium.Viewer('cesiumContainer', {
            imageryProvider: false,
            requestRenderMode: true,
            navigationHelpButton: false,
            animation: false,
            timeline: false,
            baseLayerPicker: false,
            geocoder: false,
            sceneModePicker: false,
            fullscreenButton: false,
            homeButton: false,
            infoBox: false,
            selectionIndicator: false,
            navigationInstructionsInitiallyVisible: false
        });

        const tileset = viewer.scene.primitives.add(new Cesium.Cesium3DTileset({
            url: `https://tile.googleapis.com/v1/3dtiles/root.json?key=${GoogleKey}`,
        }));

        var nycLongitude = -74.006;
        let nycLatitude = 40.7128;
        var heading = .96//5.4//2.55; // Looking straight down
        var pitch = -1.2; // Looking straight down
        var roll = 0; // No roll angle
        var height = 400; // Adjust this value as needed


        console.log("setting coords",coords[0],coords[1])
        var initialPosition = Cesium.Cartesian3.fromDegrees(coords[0]-.0002, coords[1]-.0001, height);
        var initialOrientation = {
            heading: heading,
            pitch: pitch,
            roll: roll
        };


        viewer.camera.setView({
            destination: initialPosition,
            orientation: initialOrientation,
            endTransform: Cesium.Matrix4.IDENTITY
        });

        viewer.camera.changed.addEventListener(function() {
            var cameraPosition = viewer.camera.positionCartographic;

            var latitude = Cesium.Math.toDegrees(cameraPosition.latitude);
            var longitude = Cesium.Math.toDegrees(cameraPosition.longitude);
            var heading = viewer.camera.heading;
            var pitch = viewer.camera.pitch;
            var roll = viewer.camera.roll;

            console.log(longitude,latitude,heading,pitch,roll)
        });
    }

    onMount(async() => {
        mounted = true;
    })

</script>

<svelte:head>
    <script src="https://ajax.googleapis.com/ajax/libs/cesiumjs/1.105/Build/Cesium/Cesium.js" on:load={loadCesium}></script>
</svelte:head>

<!-- {#if mounted} -->
    <div class="parent">
        <div id="cesiumContainer" style="">
        </div>    
    </div>
<!-- {/if} -->



<style>
    .parent {
        width: 100%;
        height: 100%;
    }
    #cesiumContainer {
        /* width: 100%;
        height: 100vh; */
        width: 100%;
        height: 100%;
        position: relative;
    }
</style>