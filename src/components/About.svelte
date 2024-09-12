<script>
    import {
        aboutVisible
    } from "$stores/misc.js";



    function modalClose(){
        $aboutVisible = false;
    }
</script>


<div class="about">
    <button class="close" on:click={modalClose}>Close</button>
    <p>By <a target="_blank" href="https://pudding.cool/author/matt-daniels/">Matthew Daniels</a>, for visual journalism publication <a href="https://pudding.cool/">The Pudding</a> Reach out at matt@pudding.cool</p>
    <p>Court Locations via <a href="https://www.openstreetmap.org/#map=4/38.01/-95.84">Open Street Map</a>. Satellite imagery via Google.</p>
</div>

<style>
    a {
        color: white;
    }
    .about {
        background-color: black;
        position: fixed;
        top: 50%;
        left: 0;
        right: 0;
        margin: 0 auto;
        max-width: 400px;
        padding: 1rem;
        transform: translate(0,-50%);
        padding: 0.35em 0.75em 0.625em;
    }

    .about p {
        color: white;
        
        font-family: var(--sans);
        text-align: left;
        font-size: 16px;
    }

    .close {
        margin-bottom: 20px;
        background-color: white;
        color: black;
        margin-inline-start: auto;
        display: block;
    }
</style>