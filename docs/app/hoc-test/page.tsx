import React from "react";
import { withRSCTrace, configure } from "quzz";

console.log("🔧 Configuring quzz...");
console.log("NODE_ENV:", process.env.NODE_ENV);

configure({
  logLevel: "info",
  outputFormat: "pretty",
  performance: { enabled: true, warnThreshold: 500 },
  logProps: true,
  forceEnable: true,
});

console.log("✅ quzz configured");

async function UserProfile({ userId }: { userId: string }) {
  console.log("🔍 UserProfile starting to render...");

  await new Promise((resolve) =>
    setTimeout(resolve, Math.random() * 800 + 200)
  );

  if (Math.random() < 0.2) {
    throw new Error(`Failed to load user ${userId}`);
  }

  console.log("✅ UserProfile rendered successfully");
  return (
    <div className="p-4 bg-green-100 border rounded">
      <h3>User: {userId}</h3>
      <p>Loaded at: {new Date().toLocaleTimeString()}</p>
    </div>
  );
}

async function ProductList({ category }: { category: string }) {
  console.log("🔍 ProductList starting to render...");

  await new Promise((resolve) =>
    setTimeout(resolve, Math.random() * 600 + 300)
  );

  console.log("✅ ProductList rendered successfully");
  return (
    <div className="p-4 bg-blue-100 border rounded">
      <h3>Products in {category}</h3>
      <ul>
        <li>Product 1 - $29.99</li>
        <li>Product 2 - $49.99</li>
        <li>Product 3 - $19.99</li>
      </ul>
    </div>
  );
}

console.log("🔧 Creating traced components...");

const TracedUserProfile = withRSCTrace(UserProfile, {
  componentName: "UserProfile",
  tags: ["user"],
  performance: { enabled: true, warnThreshold: 500 },
  logProps: true,
});

const TracedProductList = withRSCTrace(ProductList, {
  componentName: "ProductList",
  tags: ["product"],
  performance: { enabled: true, warnThreshold: 300 },
  logProps: true,
});

console.log("✅ Traced components created");

export default async function HOCTestPage() {
  console.log("🚀 HOCTestPage server component rendering...");

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold">quzz HOC Example</h1>
      <p className="text-gray-600">Check your terminal for quzz logs!</p>

      <div className="space-y-4">
        <TracedUserProfile userId="user_123" />
        <TracedProductList category="Electronics" />
      </div>
    </div>
  );
}
