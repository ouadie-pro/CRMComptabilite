const Product = require('../models/ProductSchema');
const logAudit = require('../utils/auditLogger');

const getAllProducts = async (req, res) => {
  try {
    const { category, status } = req.query;
    let query = {};

    if (category) query.category = category;
    if (status) query.status = status;

    const products = await Product.find(query).sort({ createdAt: -1 });
    res.status(200).json(products);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    res.status(200).json(product);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const createProduct = async (req, res) => {
  try {
    const { price, cost, unit, status, category, ...rest } = req.body;
    
    const categoryMap = { product: 'matériel', service: 'service', license: 'licence' };
    const statusMap = { active: 'actif', inactive: 'inactif' };
    
    const productData = {
      ...rest,
      priceHT: parseFloat(price) || 0,
      category: category ? (categoryMap[category] || category) : 'service',
      status: status ? (statusMap[status] || status) : 'actif'
    };
    
    const product = new Product(productData);
    await product.save();
    await logAudit({
      userId: req.user?._id,
      action: "create",
      entity: "Product",
      entityId: product._id,
      changes: { name: product.name, priceHT: product.priceHT, category: product.category },
      req
    });
    res.status(201).json({ message: 'Product created successfully', product });
  } catch (error) {
    console.error('Product creation error:', error.message, error.errors);
    if (error.name === 'ValidationError') {
      const validationErrors = Object.keys(error.errors).map(key => `${key}: ${error.errors[key].message}`);
      return res.status(400).json({ message: 'Validation error', errors: validationErrors });
    }
    if (error.code === 11000) {
      return res.status(409).json({ message: 'Product with this SKU already exists' });
    }
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const updateProduct = async (req, res) => {
  try {
    const { price, cost, unit, status, category, ...rest } = req.body;
    
    const categoryMap = { product: 'matériel', service: 'service', license: 'licence' };
    const statusMap = { active: 'actif', inactive: 'inactif' };
    
    const productData = {
      ...rest,
      ...(price !== undefined && { priceHT: parseFloat(price) || 0 }),
      ...(category && { category: categoryMap[category] || category }),
      ...(status && { status: statusMap[status] || status })
    };
    
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      productData,
      { new: true, runValidators: true }
    );
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    await logAudit({
      userId: req.user?._id,
      action: "update",
      entity: "Product",
      entityId: product._id,
      changes: req.body,
      req
    });
    res.status(200).json({ message: 'Product updated successfully', product });
  } catch (error) {
    console.error('Product update error:', error.message, error.errors);
    if (error.name === 'ValidationError') {
      const validationErrors = Object.keys(error.errors).map(key => `${key}: ${error.errors[key].message}`);
      return res.status(400).json({ message: 'Validation error', errors: validationErrors });
    }
    if (error.code === 11000) {
      return res.status(409).json({ message: 'Product with this SKU already exists' });
    }
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    await logAudit({
      userId: req.user?._id,
      action: "delete",
      entity: "Product",
      entityId: req.params.id,
      changes: { message: "Product deleted" },
      req
    });
    res.status(200).json({ message: 'Product deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct
};
