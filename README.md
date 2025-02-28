# Point of sale developed with React + MUI

This project is a point of sale system developed using React and Material-UI (MUI). It provides a user-friendly interface for managing sales transactions ando orders. The React framework allows for efficient component-based development, while MUI provides a set of pre-designed UI components for a modern and visually appealing interface.

[🚀 Live Demo](https://react-tpv.netlify.app/)

![Main Page](/public/imgs/readme/main-page.png)

## Feature: Adding Products

The point of sale system allows employees to easily add products from both the product listing and the cart panel.

![Add Products](/public/imgs/readme/add-products.gif)


### Feedback Alerts
To improve the user experience, alerts will be displayed when adding or removing products (also with orders).

![Feedback Alerts](/public/imgs/readme/feedback-alerts.gif)


## Feature: Product Variants
In addition to adding products, the point of sale system also supports product variants. For example, you can specify different sizes for a particular product. This allows for more flexibility in managing inventory and providing options to customers.

![Feedback Alerts](/public/imgs/readme/product-variants.gif)


## Feature: Edit Price for Specific Products
The point of sale system includes the ability to edit the price of specific products. This functionality is useful for applying temporary discounts, promotions, or price adjustments. Employees can easily update the price of a product to reflect any changes in pricing strategy.

![Edit Price](/public/imgs/readme/edit-price.gif)

## Feature: Add Custom Products
The point of sale system allows employees to add custom products that are not listed in the inventory. This feature is particularly useful for new products that have not been registered yet. By adding custom products, employees can easily include them in sales transactions and orders.

![Add Custom Product](/public/imgs/readme/custom-products.gif)

## Feature: Filter Products from Top Menu
Filter products directly from the top menu. This feature provides a convenient way to quickly narrow down the product selection.

![Filter Products](/public/imgs/readme/filter-products.gif)

## Feature: Order Management
Employees can register new orders and view detailed information about existing orders from the order panel.

### Registering Orders
Employees can easily register new orders by selecting products from the product listing and adding them to the cart. The system will calculate the total price and generate an order ID for each transaction.

### Viewing Order Details
The order panel provides a detailed view of each order, including the list of products, quantities, prices, and any applied discounts. Employees can also track the status of each order, such as whether it has been paid or fulfilled.

![Order Management](/public/imgs/readme/register-orders.gif)

## Responsive Design
The point of sale system has been designed to be responsive, ensuring a seamless user experience across different devices, including mobile devices. Some changes have been made to optimize the layout for mobile screens.

### Cart Window
To improve usability on mobile devices, the cart panel has been moved to a separate window. This allows users to easily access and manage their cart without obstructing the main interface.

### Quantity Indicator in Top Menu
To provide a quick overview of the number of items in the cart, a quantity indicator has been added to the top menu. 

These changes enhance the mobile experience of the point of sale system, making it more user-friendly and accessible on a variety of devices.

![Mobile Demo](/public/imgs/readme/mobile-demo.gif)

## Run the project
To run the project, follow these steps:

1. Open your terminal or command prompt.
2. Run the following command to install the project dependencies:
	```
	npm install
	```
4. Once the installation is complete, run the following command to start the development server:
	```
	npm run dev
	```
5. The project will now be running locally on your machine. You can access it by opening your web browser and navigating to `http://localhost:5173`.

That's it! You should now be able to see and interact with the point of sale system in your browser.