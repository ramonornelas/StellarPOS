import React from "react";
import ProductTable from "../components/products/product-table.component";

const ProductsAdminPage: React.FC = () => {
	return (
		<div style={{ padding: "2rem" }}>
			<h2>Administrar Productos</h2>
			<ProductTable />
		</div>
	);
};

export default ProductsAdminPage;
