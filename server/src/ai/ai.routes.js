
import express from 'express';
import pool from '../config/db.js';

const router = express.Router();

// Words to ignore when searching for products
const ignoredWords = [
  'show', 'me', 'find', 'search', 'for',
  'some', 'available', 'products', 'product',
  'please', 'do', 'you', 'have', 'any',
  'i', 'want', 'to', 'buy', 'shop',
  'the', 'a', 'an', 'is', 'are',
  'can', 'could', 'give', 'list'
];

// Search products in PostgreSQL
async function searchProducts(message) {
  const keywords = message
    .toLowerCase()
    .split(/\s+/)
    .filter(word => !ignoredWords.includes(word));

  let result;

  // General product request: show latest active products
  if (keywords.length === 0) {
    result = await pool.query(
      `SELECT name, description, price::float8 AS price, stock
       FROM products
       WHERE is_active = TRUE
       ORDER BY id DESC
       LIMIT 5`
    );
  } else {
    // Specific product request
    const conditions = keywords.map(
      (_, index) =>
        `(name ILIKE $${index + 1} OR description ILIKE $${index + 1})`
    );

    const values = keywords.map(word => `%${word}%`);

    result = await pool.query(
      `SELECT name, description, price::float8 AS price, stock
       FROM products
       WHERE is_active = TRUE
       AND (${conditions.join(' OR ')})
       ORDER BY stock DESC, name ASC
       LIMIT 5`,
      values
    );
  }

  return result.rows;
}

// Format product results
function formatProducts(products) {
  if (products.length === 0) {
    return 'Sorry, I could not find matching products. Try another product name.';
  }

  const productList = products.map(product => {
    const availability =
      product.stock > 0
        ? `${product.stock} available`
        : 'Currently out of stock';

    return `• ${product.name}\n  Price: ${product.price} ETB\n  Stock: ${availability}`;
  }).join('\n\n');

  return `Here are the matching products:\n\n${productList}`;
}

// Generate customer support responses
function generateReply(message) {
  const text = message.toLowerCase().trim();

  // English and Amharic greetings
  if (/^(hi|hello|hey|selam|ሰላም)[!. ]*$/.test(text)) {
    return 'Hello! 👋 Welcome to MarketHub. How can I help you today?\n\nሰላም! እንዴት ልርዳዎት?';
  }

  // About MarketHub
  if (
    text.includes('what is markethub') ||
    text.includes('about markethub')
  ) {
    return 'MarketHub is an online shopping platform where you can explore products, add items to your cart, and place orders.';
  }

  // Payments
  if (
    text.includes('payment') ||
    text.includes('pay')
  ) {
    return 'MarketHub supports its configured payment methods. Please check the checkout page to see the available options.';
  }

  // Orders and delivery
  if (
    text.includes('order') ||
    text.includes('delivery') ||
    text.includes('shipping')
  ) {
    return 'You can check your order information in the Orders section of your MarketHub account.';
  }

  // Registration
  if (
    text.includes('register') ||
    text.includes('account') ||
    text.includes('sign up') ||
    text.includes('signup')
  ) {
    return 'To create an account, open the Register page and enter your required details.';
  }

  // Help
  if (
    text.includes('help') ||
    text.includes('support')
  ) {
    return 'I can help you with:\n\n• Finding products\n• Checking prices and stock\n• Payments\n• Orders and delivery\n• Creating an account';
  }

  // Amharic greeting/help
  if (text.includes('ሰላም')) {
    return 'ሰላም! 👋 ወደ MarketHub እንኳን በደህና መጡ። እንዴት ልርዳዎት?';
  }

  return 'Thanks for your message! 😊 I can help you with shopping, products, payments, orders, and account questions. What would you like to know?';
}

// Detect product-related messages
function isProductRequest(message) {
  const text = message.toLowerCase();

  const productWords = [
    'product', 'products',
    'laptop', 'phone', 'shoes',
    'buy', 'shop', 'shopping',
    'coffee', 'bag', 'honey',
    'dress', 'earbuds', 'power bank',
    'netela', 'jebena', 'mesob',
    'spoon', 'cream',
    'beans', 'butter'
  ];

  return productWords.some(word => text.includes(word));
}

// Chat endpoint
router.post('/chat', async (req, res) => {
  try {
    const { message } = req.body;

    // Validate message
    if (
      !message ||
      typeof message !== 'string' ||
      !message.trim()
    ) {
      return res.status(400).json({
        error: 'Please enter a message.'
      });
    }

    const text = message.toLowerCase().trim();

    // Search database for product requests
    if (isProductRequest(text)) {
      const products = await searchProducts(text);

      return res.json({
        reply: formatProducts(products)
      });
    }

    // Otherwise generate a support response
    return res.json({
      reply: generateReply(text)
    });

  } catch (error) {
    console.error('AI chatbot error:', error.message);

    return res.status(500).json({
      error: 'Sorry, I could not process your message right now.'
    });
  }
});

export default router;
