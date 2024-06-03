import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

console.log(supabaseUrl, supabaseAnonKey)

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const addRow = async (criteria) => {

		const response = await supabase
			.from('courts-faves')
				.insert([{court_id: criteria}], { returning: "minimal" })
				.select()

			if (response.error) {
				console.log(response.error);
				throw new Error("insert failed");
			}
			return true;
}

export const countRows = async (criteria) => {
    // Replace 'your_table' with the name of your table
    let { count, error } = await supabase
      .from('courts-faves')
      .select('*', { count: 'exact' })
      .eq('court_id', criteria) // Filtering where court_id equals 10
    
    if (error) {
      console.error(error)
      return
    }
  
    console.log('Row Count:', count)
    return count
}


export const readAll = async () => {

	console.log(supabase)

    // const response = await supabase
    //     .from('courts-faves')
    //         .insert([{artist_id: 2, gen: 1}], { returning: "minimal" })
    //         .select()

    //     if (response.error) {
	// 	    console.log(response.error);
	// 	    throw new Error("insert failed");
	//     }
    //     return true;

    
    console.log(await supabase
    .from('courts-faves')
    .select('*'))

        
}
// public
export const signIn = async ({ email, password }) => {
	const response = await supabase.auth.signIn({
		email,
		password
	});
	if (response.error) {
		console.log(response.error);
		throw new Error("signIn failed");
	}
	else if (response.user) return true;
	else throw new Error("no user found");
};

export const signOut = async () => {
	const response = await supabase.auth.signOut();
	if (response.error) {
		console.log(response.error);
		throw new Error("signOut failed");
	}
	else return true;
};

export const getQuestions = async (gameId) => {
	const response = await supabase
		.from("wordgame_wod-questions");

	if (response.error) {
		console.log(response.error);
		throw new Error("getQuestions failed");
	} else if (response.data.length) {
		return response.data;
	}
	throw new Error("no questions matching that game id");
}

export const getGameColumn = async ({ gameId, column }) => {
	const response = await supabase
		.from("wordgame_games")
		.select(column)
		.eq("game_id", gameId);

	if (response.error) {
		console.log(response.error);
		throw new Error("getGameColumn failed");
	}
	else if (response.data.length) return response.data[0][column];
	else throw new Error("no games matching this id");
};

export const update = async ({ table, column, value, gameId }) => {
	const response = await supabase
		.from(table)
		.update({ [column]: value })
		.eq("game_id", gameId);

	if (response.error) {
		console.log(response.error);
		throw new Error("update failed");
	}
	else if (response.data) return response.data;
	return undefined;
}

export const insert = async ({ table, data }) => {

    console.log(data)
    const response = await supabase
        .from('entries')
            .insert(data, { returning: "minimal" })
            .select()

        if (response.error) {
		    console.log(response.error);
		    throw new Error("insert failed");
	    }
        return true;
            
	// const opts = { returning: "minimal" };
	// const response = await supabase.from(table).insert(data, opts);
	// if (response.error) {
	// 	console.log(response.error);
	// 	throw new Error("insert failed");
	// }
	// return true;
};