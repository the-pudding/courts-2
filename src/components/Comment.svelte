<script>

    import {
            isCommenting
    } from "$stores/misc.js";

    import {
        addComment,
        getComments
    } from "$utils/supabase.js";
    import { createEventDispatcher } from 'svelte';
    import { fly } from "svelte/transition";

    const dispatch = createEventDispatcher();

    export let commentId;
    let comment = '';

    let commentsForCourt = [];

    
    new Promise(async(resolve, reject) => {    	
        commentsForCourt = await getComments(commentId);
	})

    function modalClose(){
        $isCommenting = false;
    }

    function handleSubmit() {
        if (comment.trim() !== '') {
            comment = comment.trim();
            addComment(commentId,comment);
            $isCommenting = false;
            dispatch('formSubmit', commentId);
        }
    }

    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    


</script>

<div class="blackout">
    <div transition:fly={{y:-100, duration:300}} class="modal">
        <div class="comment-wrapper">
            <button class="close" on:click={modalClose}>Close</button>
            {#if commentsForCourt.length > 0}
                <p class="comment-count">{commentsForCourt.length} comment<span>{commentsForCourt.length > 1 ? "s" : ''}</span></p>
            {/if}
            {#each commentsForCourt as comment}
                {@const dateParsed = new Date(comment.created_at)}
                <p class="comment"><span>{dateParsed.toLocaleDateString('en-US', options)}</span>{comment.comment}</p>
            {/each}

            <p class="instructions">Share your comments:</p>
            <form on:submit|preventDefault={handleSubmit}>
            <textarea
                bind:value={comment}
                rows="4"
                placeholder="Write your comment..."
            />
            <button type="submit" disabled={comment.trim() === ''}>
                Submit Comment
            </button>
            </form>
        </div>
    </div>
</div>


<style>
    .comment-count {
        color: white;
        font-family: var(--sans);
        margin: 0;
        font-size: 12px;
        margin-bottom: 2px;
        text-transform: uppercase;
        letter-spacing: .5px;
        opacity: .8;
        border-bottom: 1px solid white;
        margin-bottom: 5px;
        padding-bottom: 5px;
    }
    .comment {
        color: white;
        font-family: var(--sans);
        margin: 0;
        margin-bottom: 10px;
        font-size: 16px;
    }
    .comment span {
        opacity: .8;
        font-size: 12px;
        display: block;
    }
    .blackout {
        width: 100%;
        height: 100%;
        background-color: rgba(0,0,0,.7);
        position: fixed;
        display: block;
    }
    .instructions {
        font-family: var(--sans);
        color: white;
        margin: 0;
        font-size: 14px;
        border-top: 1px solid rgba(255,255,255,.8);
        margin-bottom: 10px;
        padding-top: 15px;
        margin-top: 5px;
    }
    .comment-wrapper {
        width: 100%;
        margin: 0 auto;
        padding: 10px;
    }
    .close {
        margin-bottom: 20px;
        background-color: #a7a7a7;
        margin-top: 10px;
    }
    .modal {
        background-color: black;
        max-height: 500px;
        width: 500px;
        max-width: calc(100vw - 50px);
        z-index: 1000;
        left: 0;
        right: 0;
        margin: 0 auto;
        top: 50%;
        transform: translate(0,-50%);
        position: absolute;
        display: block;
        border-radius: 10px;
    }

    textarea {
        height: 100px;
        width: 100%;
        margin: 0 auto;
        display: block;
        margin-bottom: 10px;
    }

</style>