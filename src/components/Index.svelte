<script>
	import { getContext, onMount } from "svelte";
	import viewport from "$stores/viewport.js";
	import DeckComponent from "$components/Deck.svelte"
	// import Demo from "$components/demo/Demo.svelte"
	let el;
	let mounted;
	$:console.log($viewport)

	onMount(async () => {
		mounted = true;
	})

</script>


{#if mounted && $viewport}
	<!-- <Demo /> -->
	<DeckComponent viewportWidth={$viewport.width} viewportHeight={$viewport.height}/>
{/if}


<div class="overlay">
	<!-- <button on:click={() => sortImages()}>sort</button> -->
</div>

<style>
	.overlay {
		position: fixed;
		top: 0;
		left: 0;
	}

</style>

<!-- <WIP /> -->
<!-- <Demo /> -->
<!-- <Footer /> -->
