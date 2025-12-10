// app/api/products/[id]/route.js

// Standard imports
import connectDB from "../../../lib/mongodb";
import Product from "../../../models/ProductModel";

// GET request handler
export async function GET(req, context) {
  try {
    // Connect to database
    await connectDB();

    // Extract product ID
    const { id } = await context.params;

    // Fetch product details
    const product = await Product.findById(id).lean();

    // Handle missing product
    if (!product) {
      return new Response(JSON.stringify({ error: "Product not found" }), { status: 404 });
    }

    // Return product data
    return new Response(JSON.stringify(product), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });

  } catch (err) {
    console.error("Error fetching product:", err);
    
    // Handle invalid ID
    if (err.name === 'CastError') {
        return new Response(JSON.stringify({ error: "Invalid Product ID format" }), { status: 400 });
    }

    // Return server error
    return new Response(JSON.stringify({ error: "Internal Server Error" }), { status: 500 });
  }
}