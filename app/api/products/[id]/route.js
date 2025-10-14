// app/api/products/[id]/route.js
import connectDB from "../../../lib/mongodb";
import Product from "../../../models/ProductModel";

// GET a single product by ID
export async function GET(req, context) {
  try {
    await connectDB();
    const { id } = context.params;
    const product = await Product.findById(id).lean();

    if (!product) {
      return new Response(JSON.stringify({ error: "Product not found" }), { status: 404 });
    }

    return new Response(JSON.stringify(product), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (err) {
    console.error("Error fetching product:", err);
    return new Response(JSON.stringify({ error: "Internal Server Error" }), { status: 500 });
  }
}