import connectDB from "./../../../lib/mongodb";
import Pet from "./../../../models/PetModel";

export async function DELETE(req, context) {
  try {
    await connectDB();

    const { id } = await context.params;
    const deleted = await Pet.findByIdAndDelete(id);

    if (!deleted) {
      return new Response(JSON.stringify({ error: "Pet not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ message: "Pet deleted successfully" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Error deleting pet:", err);
    return new Response(JSON.stringify({ error: "Internal Server Error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
