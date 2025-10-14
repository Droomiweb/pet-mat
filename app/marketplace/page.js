// app/marketplace/page.js
"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { auth } from "../lib/firebase";

export default function MarketplacePage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Fetches all products from the API
  const fetchProducts = async () => {
    try {
      const res = await fetch("/api/products");
      if (res.ok) {
        const data = await res.json();
        setProducts(data);
      }
    } catch (err) {
      console.error("Error fetching products:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleAddProduct = () => {
    const user = auth.currentUser;
    if (!user) {
      // Redirect to login if user is not authenticated
      alert("You must be logged in to add a product.");
      return router.push("/Login");
    }
    router.push("/add-product");
  };

  if (loading) {
    return <p className="text-center text-[#4F200D] mt-20">Loading marketplace...</p>;
  }

  return (
    <div className="min-h-screen bg-[#F6F1E9] p-4 md:p-10">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-[#4F200D]">Pet Marketplace</h1>
          <button
            onClick={handleAddProduct}
            className="bg-[#FF9A00] hover:bg-[#e68a00] text-white font-semibold px-6 py-2 rounded-xl shadow-lg transition-all duration-200"
          >
            + Add Product
          </button>
        </div>

        {products.length === 0 ? (
          <p className="text-[#4F200D] text-center text-xl">No products available yet.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {products.map((product) => (
              <Link key={product._id} href={`/marketplace/${product._id}`}>
                <div className="bg-white rounded-2xl shadow-lg p-4 cursor-pointer hover:scale-105 transition-transform duration-300">
                  {product.images?.[0] && (
                    <img
                      src={product.images[0]}
                      alt={product.name}
                      className="w-full h-48 object-cover rounded-xl mb-4"
                    />
                  )}
                  <h3 className="font-bold text-xl text-[#4F200D] mb-1">{product.name}</h3>
                  <p className="text-[#4F200D] text-lg font-semibold">₹ {product.price}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}