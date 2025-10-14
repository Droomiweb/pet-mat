// app/marketplace/[id]/page.js
"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

export default function ProductDetailPage() {
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const params = useParams();
  const router = useRouter();

  const fetchProduct = async () => {
    try {
      const res = await fetch(`/api/products/${params.id}`);
      if (!res.ok) {
        return router.push("/marketplace");
      }
      const data = await res.json();
      setProduct(data);
    } catch (err) {
      console.error("Error fetching product:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProduct();
  }, [params.id]);

  if (loading) {
    return <p className="text-center text-[#4F200D] mt-20">Loading product details...</p>;
  }

  if (!product) {
    return <p className="text-center text-[#4F200D] mt-20">Product not found.</p>;
  }

  return (
    <div className="min-h-screen bg-[#F6F1E9] p-4 md:p-10">
      <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-lg p-6 md:p-10">
        <div className="grid md:grid-cols-2 gap-8">
          {/* Product Images */}
          <div className="space-y-4">
            {product.images?.length > 0 && (
              <img
                src={product.images[0]}
                alt={product.name}
                className="w-full rounded-xl object-cover"
              />
            )}
            {/* You could add a gallery here for more images */}
          </div>

          {/* Product Details */}
          <div>
            <h1 className="text-3xl font-bold text-[#4F200D] mb-2">{product.name}</h1>
            <p className="text-xl font-semibold text-[#FF9A00] mb-4">₹ {product.price}</p>
            <p className="text-[#4F200D] leading-relaxed">{product.description}</p>
            
            <div className="mt-6 border-t pt-4">
              <h2 className="text-xl font-bold text-[#4F200D]">Seller Information</h2>
              <p className="mt-2 text-[#4F200D]">Name: {product.ownerName}</p>
              <p className="mt-1 text-[#4F200D]">Contact: {product.contact}</p>
            </div>
            
            {/* Mating button would be similar to the pet page, but for a purchase inquiry */}
            <button
              className="mt-6 w-full bg-[#4F200D] hover:bg-orange-500 text-white font-bold py-3 px-6 rounded-lg transition"
              onClick={() => alert(`Contacting seller: ${product.contact}`)}
            >
              Contact Seller
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}