import { withSupabase } from "npm:@supabase/server@^1"

export default {
  fetch: withSupabase({ auth: "user" }, async (_req, ctx) => {
    const { data, error } = await ctx.supabase.from("todos").select()
    if (error) {
      return Response.json({ error: error.message }, { status: 500 })
    }
    return Response.json(data)
  }),
}
