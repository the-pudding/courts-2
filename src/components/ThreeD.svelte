

  <script>
    import { onMount } from "svelte";
    const GoogleKey = import.meta.env.VITE_GOOGLE;

    export let coords;

    $: console.log(coords)

    onMount(() => {
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
        var heading = 2.55; // Looking straight down
        var pitch = -32; // Looking straight down
        var roll = 0; // No roll angle

        // Set the height to achieve the desired zoom level
        var height = 400; // Adjust this value as needed


        console.log("settting coords",coords[0],coords[1])
        var initialPosition = Cesium.Cartesian3.fromDegrees(coords[0], coords[1], height);
        var initialOrientation = {
            heading: heading,
            pitch: pitch,
            roll: roll
        };


        viewer.camera.setView({
            destination: initialPosition,
            // orientation: initialOrientation,
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

})

</script>
<div class="parent">
    <div id="cesiumContainer" style="width:100vw; height:100vh">
    </div>    
</div>


<style>
    .parent {
        width: 100%;
        height: 100vh;
        position: fixed;
    }
    #cesiumContainer {
        /* width: 100%;
        height: 100vh; */
        position: relative;
    }
</style>