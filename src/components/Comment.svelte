<script>

    import {
            isCommenting
    } from "$stores/misc.js";

    import {
        addComment
    } from "$utils/supabase.js";


    import { fly } from "svelte/transition";


    export let commentId;
    let comment = '';

    function modalClose(){
        $isCommenting = false;
    }

    function handleSubmit() {
        if (comment.trim() !== '') {
            comment = comment.trim();
            addComment(commentId,comment);
            $isCommenting = false;
        }
    }

</script>

<div class="blackout">
    <div transition:fly={{y:-100, duration:300}} class="modal">
        <div class="comment-wrapper">
            <button class="close" on:click={modalClose}>Close</button>
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
    }
    .comment-wrapper {
        width: calc(100% - 20px);
        margin: 0 auto;
    }
    .close {
        margin-bottom: 20px;
        background-color: #a7a7a7;
        margin-top: 10px;
    }
    .modal {
        background-color: black;
        height: 500px;
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
        height: 300px;
        width: 100%;
        margin: 0 auto;
        display: block;
        margin-bottom: 10px;
    }

</style>