<script>
	// import Map from "$svg/map.svg";

	export let label;
	export let style = "inner";
	export let options = ["on", "off"];
	export let value;

	$: checked = value === options[0].value;

	const id = `toggle-${Math.floor(Math.random() * 1000000)}`;

	const handleClick = (event) => {
		const target = event.target;
		const state = target.getAttribute("aria-checked");
		checked = state === "true" ? false : true;
		value = checked ? options[0].value : options[1].value;
	};
</script>

<div class="toggle toggle--{style}">
	<!-- <span class="label" {id}>{label}</span> -->
	<button
		role="switch"
		aria-checked={checked}
		aria-labelledby={id}
		on:click={handleClick}
	>
		{#if style === "inner"}
			<span style="">
				<!-- {@html Map} -->
				{options[0].text}
			</span>
			<span>{options[1].text}</span>
		{/if}
	</button>
</div>

<style>
	.toggle button,
	.label {
		font-family: inherit;
		font-size: 1em;
	}
	svg {
		position: absolute;
		right: 5px;
	}

	.toggle--inner [role="switch"][aria-checked="true"] :first-child,
	[role="switch"][aria-checked="false"] :last-child {
		display: inline-block;
		border-radius: 4px;
		background: white;
		color: black;
		font-weight: 600;
		-webkit-font-smoothing: antialiased;
  		-moz-osx-font-smoothing: grayscale;
	}

	.toggle--inner [role="switch"][aria-checked="true"] :first-child,
	[role="switch"][aria-checked="false"] :last-child svg {
		stroke: black;
	}

	.toggle--inner button {
		background-color: #292829;
		color: white;
		padding: 0;
		height: 36px;
		border-radius: 4px;
	}

	.toggle--inner button span {
		user-select: none;
		pointer-events: none;
		display: inline-block;
		line-height: 2;
		padding: 5px 10px;
		height: 100%;
		vertical-align: middle;
		font-family: var(--sans);
		color: rgba(255,255,255,0.9);
		font-size: 12px;
		letter-spacing: -.2px;
		position: relative;
	}

	.toggle--inner button:focus {
		/* box-shadow: 0 0 4px 0 var(--color-focus); */
	}

	.toggle--slider {
		display: flex;
		align-items: center;
	}

	.toggle--slider button {
		height: 2em;
		position: relative;
		margin-left: 0.5em;
		background: var(--color-gray-300);
	}

	.toggle--slider button:focus {
		/* box-shadow: 0 0px 4px var(--color-focus); */
	}

	.toggle--slider button::before {
		content: "";
		position: absolute;
		width: 1.5em;
		height: 1.5em;
		background: var(--color-white);
		border-radius: 4px;
		top: 0.25em;
		right: 1.75em;
	}

	.toggle--slider button[aria-checked="true"] {
		background-color: var(--color-gray-900);
	}

	.toggle--slider button[aria-checked="true"]::before {
		transform: translateX(1.5em);
	}

	.toggle--slider button:focus {
		/* box-shadow: 0 0 4px 0 var(--color-focus); */
	}

	@media only screen and (max-width: 500px) {
		.toggle--inner button span {
			font-size: 14px;
			line-height: 1.8;
		}
		.toggle--inner button {
			background-color: black;
		}
	}
</style>
