import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

console.log(supabaseUrl, supabaseAnonKey)

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const getComments = async(courtId) => {
		let { data, error } = await supabase
		.from('courts_comments')
		.select()
		.eq('court_id', courtId)
		.eq('moderation', true)
		;

	if (error) {
		console.error(error)
		return
	}
	return data
}

export const addComment = async (courtId,comment) => {

	const response = await supabase
		.from('courts_comments')
			.insert([{court_id: courtId,comment:comment}], { returning: "minimal" })
			.select()

		if (response.error) {
			console.log(response.error);
			throw new Error("insert failed");
		}
		return true;
}

export const countFaves = async () => {
	try {
		const { data, error } = await supabase.rpc('courts_calc')
		if (error) {
		  throw error;
		}	
		return data;
	  } catch (error) {
		console.error('Error fetching map counts:', error);
	  }	
}

export const addRow = async (criteria) => {

		const response = await supabase
			.from('courts_faves')
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
      .from('courts_faves')
      .select('*', { count: 'exact' })
      .eq('court_id', criteria) // Filtering where court_id equals 10
    
    if (error) {
      console.error(error)
      return
    }
  
    console.log('Row Count:', count)
    return count
}
