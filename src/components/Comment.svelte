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


<div transition:fly={{y:200, duration:1000}} class="modal">
    <div class="comment-wrapper">
        <button class="close" on:click={modalClose}>close</button>
        <p class="instructions">tell us your feelings about court:</p>
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

<style>
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
    }
    .modal {
        background-color: black;
        height: 500px;
        width: 500px;
        z-index: 1000;
        left: 0;
        right: 0;
        margin: 0 auto;
        top: 50%;
        transform: translate(0,-50%);
        position: fixed;
        display: block;
    }

    textarea {
        height: 300px;
        width: 100%;
        margin: 0 auto;
        display: block;
        margin-bottom: 20px;
    }

</style>