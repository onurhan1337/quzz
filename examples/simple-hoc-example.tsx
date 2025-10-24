import React from "react";
import { withRSCTrace, configure } from "quzz";

configure({
  logLevel: "info",
  outputFormat: "pretty",
  performance: { enabled: true, warnThreshold: 500 },
  logProps: true,
  forceEnable: true, // Force enable even in production for testing
});

async function UserProfile({ userId }: { userId: string }) {
  await new Promise((resolve) =>
    setTimeout(resolve, Math.random() * 800 + 200)
  );

  if (Math.random() < 0.2) {
    throw new Error(`Failed to load user ${userId}`);
  }

  return (
    <div className="p-4 bg-green-100 border rounded">
      <h3>User: {userId}</h3>
      <p>Loaded at: {new Date().toLocaleTimeString()}</p>
    </div>
  );
}

async function ProductList({ category }: { category: string }) {
  await new Promise((resolve) =>
    setTimeout(resolve, Math.random() * 600 + 300)
  );

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

export default async function SimpleHOCExample() {
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
