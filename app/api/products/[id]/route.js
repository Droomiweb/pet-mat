// app/api/products/[id]/route.js

// 1. IMPORTS
import connectDB from "../../../lib/mongodb";
import Product from "../../../models/ProductModel";

// 2. GET HANDLER
// This function handles GET requests to /api/products/:id
export async function GET(req, context) {
  try {
    // Ensure database connection is active
    await connectDB();

    // 3. EXTRACT ID
    // In Next.js App Router, dynamic route parameters are passed via the second argument 'context'.
    // We await params because in the latest Next.js versions, params can be a Promise.
    const { id } = await context.params;

    // 4. FETCH PRODUCT
    // .lean() converts the Mongoose document to a plain JavaScript object.
    // This improves performance for read-only operations.
    const product = await Product.findById(id).lean();

    // 5. HANDLE NOT FOUND
    if (!product) {
      return new Response(JSON.stringify({ error: "Product not found" }), { status: 404 });
    }

    // 6. SUCCESS RESPONSE
    return new Response(JSON.stringify(product), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });

  } catch (err) {
    console.error("Error fetching product:", err);
    
    // Check for specific CastError (invalid Object ID format)
    if (err.name === 'CastError') {
        return new Response(JSON.stringify({ error: "Invalid Product ID format" }), { status: 400 });
    }

    return new Response(JSON.stringify({ error: "Internal Server Error" }), { status: 500 });
  }
}