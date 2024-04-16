<script>
	import { getContext, onMount } from "svelte";
	import DeckComponent from "$components/Deck.svelte"
	let el;
	let mounted;
	onMount(async () => {
		mounted = true;
	})

</script>

{#if mounted}
	<DeckComponent />
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
