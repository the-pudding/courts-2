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
    <p>By <a target="_blank" href="https://pudding.cool/author/matt-daniels/">Matthew Daniels</a>, for visual journalism publication <a href="https://pudding.cool/">The Pudding</a>.</p>
    <p>Reach out at matt@pudding.cool</p>
    <p>Court Locations via <a href="https://www.openstreetmap.org/#map=4/38.01/-95.84">Open Street Map</a>. Satellite imagery via Google. Notable prior art in satellite imagery: Joshua Begley&rsquo;s <a href='https://www.studioptcd.com/reference-projects/prison-map' target='_blank'>Prison Map</a> (currently offline), <a href='https://theintercept.co/officer-involved/' target='_blank'>Officer Involved</a>, and <a href='https://projects.theintercept.com/fatal-migrations/' target='_blank'>Fatal Migrations</a>, as well as Jenny Odell&rsquo;s <a href='https://www.jennyodell.com/satellite.html' target='_blank'>Satellite Collections</a>.</p>
    <p style="margin-bottom:0;">If you like this project, consider supporting <a href="https://www.instagram.com/project_backboard/" target="_blank">Project Backboard</a>, a non-profit that painted/renovated many of the courts seen in the satellite imagery.</p>
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
        padding: 15px 20px;
        max-width: calc(100% - 20px);
    }

    .about p {
        color: white;
        
        font-family: var(--sans);
        text-align: left;
        font-size: 14px;
        font-weight: 400;
        -webkit-font-smoothing: antialiased;
  		-moz-osx-font-smoothing: grayscale;

    }

    .close {
        margin-bottom: 20px;
        background-color: white;
        color: black;
        margin-inline-start: auto;
        display: block;
        transform: translate(5px,0);
    }
</style>