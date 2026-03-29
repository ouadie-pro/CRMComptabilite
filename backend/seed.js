const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
require('dotenv').config();

const User = require('./models/userSchema');
const Company = require('./models/CompanySchema');
const Client = require('./models/ClientSchema');
const Invoice = require('./models/InvoiceSchema');
const Product = require('./models/ProductSchema');
const PaymentGateway = require('./models/PaymentGatewaySchema');
const Payment = require('./models/PaymentSchema');
const CashTransaction = require('./models/CashTransactionSchema');
const Reminder = require('./models/ReminderSchema');
const Interaction = require('./models/InteractionSchema');
const Settings = require('./models/SettingsSchema');

const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/crm_comptabilite';

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const clearCollections = async () => {
  const collections = [
    User, Company, Client, Invoice, Product,
    PaymentGateway, Payment, CashTransaction,
    Reminder, Interaction, Settings
  ];
  
  for (const Collection of collections) {
    try {
      await Collection.deleteMany({});
      console.log(`  - Cleared ${Collection.modelName}`);
    } catch (err) {
      console.log(`  - Skipped ${Collection.modelName} (no clear needed)`);
    }
  }
};

const seedUsers = async () => {
  const users = [
    {
      name: 'Administrateur',
      email: 'admin@crm.fr',
      password: await bcrypt.hash('admin123', 12),
      role: 'admin'
    },
    {
      name: 'Comptable Principal',
      email: 'comptable@crm.fr',
      password: await bcrypt.hash('comptable123', 12),
      role: 'comptable'
    }
  ];

  const existingUsers = await User.countDocuments();
  if (existingUsers > 0) {
    console.log('  Users already exist, skipping');
    return User.find().limit(2);
  }

  const created = await User.insertMany(users);
  console.log('  Created 2 users');
  return created;
};

const seedCompanies = async () => {
  const existing = await Company.countDocuments();
  if (existing > 0) {
    console.log('  Companies already exist, skipping');
    return Company.find().limit(2);
  }

  const companies = [
    {
      name: 'Tech Solutions Maroc SARL',
      address: '158 Boulevard Mohammed V, 4ème étage, Agdal',
      city: 'Rabat',
      ice: '001781234567890023',
      rc: 'Rabat-152847',
      if: '42365871',
      phone: '+212 5 37 68 45 00',
      currency: 'MAD',
      defaultVatRate: 20,
      invoiceNumberFormat: 'FACT-{YYYY}-{0000}',
      smtpServer: 'smtp.techsolutions.ma',
      paymentReminderDay1: 3,
      paymentReminderDay2: 7
    },
    {
      name: 'Digital Services Casablanca',
      address: '45 Rue Fès, Hay Hassani',
      city: 'Casablanca',
      ice: '001782345678901045',
      rc: 'Casablanca-984562',
      if: '78945623',
      phone: '+212 5 22 34 56 78',
      currency: 'MAD',
      defaultVatRate: 20,
      invoiceNumberFormat: 'DS-{YYYY}-{0000}',
      smtpServer: 'smtp.digitalservices.ma',
      paymentReminderDay1: 5,
      paymentReminderDay2: 10
    }
  ];

  const created = await Company.insertMany(companies);
  console.log('  Created 2 companies');
  return created;
};

const seedPaymentGateways = async () => {
  const existing = await PaymentGateway.countDocuments();
  if (existing > 0) {
    console.log('  Payment gateways already exist, skipping');
    return PaymentGateway.find();
  }

  const gateways = [
    {
      name: 'Stripe',
      type: 'stripe',
      isActive: true,
      apiKey: 'sk_test_xxxxxxxxxxxxxxxxxxxxx',
      apiSecret: 'whsec_xxxxxxxxxxxxxxxxxxxxx',
      webhookUrl: 'https://votre-domaine.com/api/webhooks/stripe',
      configuration: {
        supportedCurrencies: ['MAD', 'EUR', 'USD'],
        paymentMethods: ['card', 'bank_transfer']
      }
    },
    {
      name: 'PayPal Morocco',
      type: 'paypal',
      isActive: false,
      apiKey: '',
      apiSecret: '',
      webhookUrl: '',
      configuration: {
        supportedCurrencies: ['MAD', 'EUR', 'USD'],
        paymentMethods: ['paypal']
      }
    }
  ];

  await PaymentGateway.insertMany(gateways);
  console.log('  Created 2 payment gateways');
};

const seedProducts = async () => {
  const existing = await Product.countDocuments();
  if (existing > 0) {
    console.log('  Products already exist, skipping');
    return Product.find().limit(3);
  }

  const products = [
    {
      sku: 'CONS-001',
      name: 'Consultation Stratégique',
      category: 'service',
      priceHT: 5000,
      vatRate: 20,
      status: 'actif'
    },
    {
      sku: 'DEV-WEB',
      name: 'Développement Web Sur Mesure',
      category: 'service',
      priceHT: 25000,
      vatRate: 20,
      status: 'actif'
    },
    {
      sku: 'LIC-Office365',
      name: 'Licence Microsoft 365 Business',
      category: 'licence',
      priceHT: 1200,
      vatRate: 20,
      status: 'actif'
    }
  ];

  const created = await Product.insertMany(products);
  console.log('  Created 3 products');
  return created;
};

const seedClients = async () => {
  const existing = await Client.countDocuments();
  if (existing > 0) {
    console.log('  Clients already exist, skipping');
    return Client.find().limit(5);
  }

  const clients = [
    {
      companyName: 'Groupe Annahj Pour le Commerce',
      contactName: 'Ahmed Benjelloun',
      contactTitle: 'Directeur Financier',
      email: 'contact@annahj.ma',
      phone: '+212 5 37 82 15 00',
      address: '23 Avenue Hassan II',
      city: 'Rabat',
      country: 'Maroc',
      ice: '001781000012345678',
      status: 'actif',
      totalBilled: 150000
    },
    {
      companyName: 'SARL Zakoura International',
      contactName: 'Fatima Zahra El Idrissi',
      contactTitle: 'Responsable Achats',
      email: 'achats@zakoura.ma',
      phone: '+212 5 22 98 45 12',
      address: '78 Boulevard Bir Anzarane',
      city: 'Casablanca',
      country: 'Maroc',
      ice: '002289000123456789',
      status: 'actif',
      totalBilled: 87500
    },
    {
      companyName: 'Cie Maritime Atlantique SA',
      contactName: 'Mohammed Amrani',
      contactTitle: 'DG',
      email: 'direction@cmatlantique.ma',
      phone: '+212 5 39 34 56 78',
      address: 'Port de Tanger Med, Zone Logistique',
      city: 'Tanger',
      country: 'Maroc',
      ice: '003910000123456789',
      status: 'nouveau',
      totalBilled: 0
    },
    {
      companyName: 'BTP Atlas Construction',
      contactName: 'Karim Tazi',
      contactTitle: 'Chef Projet',
      email: 'projets@atlas-btp.ma',
      phone: '+212 5 24 45 67 89',
      address: '145 Zone Industrielle, Ouled Saleh',
      city: 'Marrakech',
      country: 'Maroc',
      ice: '004012000123456789',
      status: 'en_retard',
      totalBilled: 320000
    },
    {
      companyName: 'Laboratoire Al Khair Analyses',
      contactName: 'Dr. Younes Benkirane',
      contactTitle: 'Administrateur',
      email: 'admin@labalkhair.ma',
      phone: '+212 5 35 67 89 00',
      address: '34 Rue Ibn Rochd',
      city: 'Fès',
      country: 'Maroc',
      ice: '005123000123456789',
      status: 'actif',
      totalBilled: 45000
    }
  ];

  const created = await Client.insertMany(clients);
  console.log('  Created 5 clients');
  return created;
};

const seedInvoices = async (clients, products) => {
  const existing = await Invoice.countDocuments();
  if (existing > 0) {
    console.log('  Invoices already exist, skipping');
    return Invoice.find().limit(5);
  }

  const now = new Date();
  const oneDay = 24 * 60 * 60 * 1000;

  const invoicesData = [
    {
      status: 'payé',
      daysOffset: -60,
      dueDaysOffset: -30,
      clientIdx: 0,
      items: [
        { name: 'Consultation Stratégique', quantity: 2, unitPriceHT: 5000, vatRate: 20, discount: 0 },
        { name: 'Rapport d\'analyse', quantity: 1, unitPriceHT: 15000, vatRate: 20, discount: 10 }
      ]
    },
    {
      status: 'envoyé',
      daysOffset: -20,
      dueDaysOffset: 10,
      clientIdx: 1,
      items: [
        { name: 'Développement Web Sur Mesure', quantity: 1, unitPriceHT: 25000, vatRate: 20, discount: 5 }
      ]
    },
    {
      status: 'en_retard',
      daysOffset: -60,
      dueDaysOffset: -15,
      clientIdx: 3,
      items: [
        { name: 'Matériaux de construction', quantity: 100, unitPriceHT: 500, vatRate: 20, discount: 0 },
        { name: 'Main d\'œuvre spécialisée', quantity: 20, unitPriceHT: 1000, vatRate: 20, discount: 0 }
      ]
    },
    {
      status: 'brouillon',
      daysOffset: -2,
      dueDaysOffset: 28,
      clientIdx: 2,
      items: [
        { name: 'Services de consulting', quantity: 5, unitPriceHT: 3000, vatRate: 20, discount: 15 }
      ]
    },
    {
      status: 'payé',
      daysOffset: -45,
      dueDaysOffset: -20,
      clientIdx: 4,
      items: [
        { name: 'Licence Microsoft 365 Business', quantity: 10, unitPriceHT: 1200, vatRate: 20, discount: 0 },
        { name: 'Installation et configuration', quantity: 1, unitPriceHT: 5000, vatRate: 20, discount: 0 }
      ]
    }
  ];

  const createdInvoices = [];
  
  for (let i = 0; i < invoicesData.length; i++) {
    const invData = invoicesData[i];
    const issueDate = new Date(now.getTime() + invData.daysOffset * oneDay);
    const dueDate = new Date(now.getTime() + invData.dueDaysOffset * oneDay);

    let subtotalHT = 0;
    let totalVat = 0;
    const items = invData.items.map(item => {
      const totalBeforeDiscount = item.quantity * item.unitPriceHT;
      const discountAmount = totalBeforeDiscount * (item.discount / 100);
      const totalHT = totalBeforeDiscount - discountAmount;
      const vat = totalHT * (item.vatRate / 100);
      
      subtotalHT += totalHT;
      totalVat += vat;
      
      return {
        productId: products[i % products.length]?._id || null,
        name: item.name,
        description: item.name,
        quantity: item.quantity,
        unitPriceHT: item.unitPriceHT,
        vatRate: item.vatRate,
        discount: item.discount,
        totalHT: Math.round(totalHT * 100) / 100
      };
    });

    const totalTTC = subtotalHT + totalVat;
    const isPaid = invData.status === 'payé';

    const invoice = new Invoice({
      number: `FACT-2026-${String(i + 1).padStart(4, '0')}`,
      clientId: clients[invData.clientIdx]._id,
      items,
      status: invData.status,
      issueDate,
      dueDate,
      subtotalHT: Math.round(subtotalHT * 100) / 100,
      totalDiscount: 0,
      totalVat: Math.round(totalVat * 100) / 100,
      totalTTC: Math.round(totalTTC * 100) / 100,
      totalPaid: isPaid ? Math.round(totalTTC * 100) / 100 : 0,
      remainingAmount: isPaid ? 0 : Math.round(totalTTC * 100) / 100
    });

    await invoice.save();
    createdInvoices.push(invoice);
  }

  console.log('  Created 5 invoices');
  return createdInvoices;
};

const seedPayments = async (invoices, clients) => {
  const existing = await Payment.countDocuments();
  if (existing > 0) {
    console.log('  Payments already exist, skipping');
    return Payment.find().limit(5);
  }

  const paidInvoices = invoices.filter(inv => inv.status === 'payé');
  const payments = [];
  const methods = ['virement', 'cheque', 'carte'];

  for (let i = 0; i < paidInvoices.length; i++) {
    const invoice = paidInvoices[i];
    const client = clients.find(c => c._id.toString() === invoice.clientId.toString());
    
    const payment = new Payment({
      invoiceId: invoice._id,
      clientId: invoice.clientId,
      amount: invoice.totalTTC,
      method: methods[i % methods.length],
      paidAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
      reference: `PAY-${Date.now()}-${i}`,
      notes: `Paiement intégral de la facture ${invoice.number}`
    });

    await payment.save();
    payments.push(payment);

    const user = await User.findOne({ role: 'admin' });
    await CashTransaction.createFromPayment(payment, invoice, user?._id);
  }

  console.log(`  Created ${payments.length} payments with cash transactions`);
  return payments;
};

const seedExpenses = async () => {
  const existing = await Expense.countDocuments();
  if (existing > 0) {
    console.log('  Expenses already exist, skipping');
    return Expense.find().limit(5);
  }

  const Expense = require('./models/ExpenseSchema');
  const user = await User.findOne({ role: 'admin' });

  const expensesData = [
    {
      description: 'Salaires équipe technique - Janvier 2026',
      amount: 85000,
      category: 'salaire',
      vendor: 'Social Bank',
      paymentMethod: 'virement',
      status: 'approved'
    },
    {
      description: 'Loyer bureau Rabat - Mars 2026',
      amount: 25000,
      category: 'loyer',
      vendor: 'SCI ImmoInvest',
      paymentMethod: 'virement',
      status: 'approved'
    },
    {
      description: 'Services Cloud AWS - Hébergement',
      amount: 4500,
      category: 'services',
      vendor: 'AWS Morocco',
      paymentMethod: 'carte',
      status: 'approved'
    },
    {
      description: 'Fournitures bureau et consommables',
      amount: 3500,
      category: 'fournitures',
      vendor: 'Bureau Plus SARL',
      paymentMethod: 'cheque',
      status: 'pending'
    },
    {
      description: 'Transport et-logistique - Livraison clients',
      amount: 8500,
      category: 'transport',
      vendor: 'STTM Transport',
      paymentMethod: 'virement',
      status: 'approved'
    }
  ];

  for (const expData of expensesData) {
    const expense = new Expense({
      ...expData,
      date: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
      userId: user?._id
    });
    await expense.save();
    await CashTransaction.createFromExpense(expense, user?._id);
  }

  console.log('  Created 5 expenses with cash transactions');
};

const seedReminders = async (clients, invoices) => {
  const existing = await Reminder.countDocuments();
  if (existing > 0) {
    console.log('  Reminders already exist, skipping');
    return Reminder.find().limit(5);
  }

  const now = new Date();
  const oneDay = 24 * 60 * 60 * 1000;

  const remindersData = [
    { daysOffset: 2, type: 'payment', status: 'pending', clientIdx: 1 },
    { daysOffset: 5, type: 'followup', status: 'pending', clientIdx: 1 },
    { daysOffset: -3, type: 'payment', status: 'sent', clientIdx: 3 },
    { daysOffset: 7, type: 'renewal', status: 'pending', clientIdx: 0 },
    { daysOffset: 10, type: 'followup', status: 'pending', clientIdx: 4 }
  ];

  for (let i = 0; i < remindersData.length; i++) {
    const remData = remindersData[i];
    const invoice = invoices.find(inv => 
      inv.clientId.toString() === clients[remData.clientIdx]._id.toString()
    );

    if (!invoice) continue;

    const reminder = new Reminder({
      clientId: clients[remData.clientIdx]._id,
      invoiceId: invoice._id,
      type: remData.type,
      scheduledDate: new Date(now.getTime() + remData.daysOffset * oneDay),
      status: remData.status,
      sentDate: remData.status === 'sent' ? new Date(now.getTime() - 3 * oneDay) : null,
      message: `${remData.type === 'payment' ? 'Rappel de paiement' : remData.type === 'followup' ? 'Relance client' : 'Renouvellement contrat'} - ${invoice.number}`
    });

    await reminder.save();
  }

  console.log('  Created 5 reminders');
};

const seedInteractions = async (clients) => {
  const existing = await Interaction.countDocuments();
  if (existing > 0) {
    console.log('  Interactions already exist, skipping');
    return Interaction.find().limit(5);
  }

  const users = await User.find().limit(2);

  const interactionsData = [
    { clientIdx: 0, type: 'call', subject: 'Suivi projet en cours', description: 'Discussion sur l\'avancement du projet de digitalisation. Client satisfait.' },
    { clientIdx: 0, type: 'email', subject: 'Envoi proposition commerciale', description: 'Proposition envoyée pour la phase 2 du projet.' },
    { clientIdx: 1, type: 'meeting', subject: 'Présentation solution web', description: 'Réunion productive avec l\'équipe dirigeante. Présentation de la solution sur mesure.' },
    { clientIdx: 1, type: 'call', subject: 'Relance devis', description: 'Appel de suivi suite à l\'envoi du devis. En attente de validation.' },
    { clientIdx: 2, type: 'email', subject: 'Premier contact commercial', description: 'Envoi brochuretarifaire. Intérêt manifesté pour les services de consulting.' }
  ];

  for (let i = 0; i < interactionsData.length; i++) {
    const intData = interactionsData[i];
    
    const interaction = new Interaction({
      clientId: clients[intData.clientIdx]._id,
      userId: users[i % users.length]._id,
      type: intData.type,
      subject: intData.subject,
      description: intData.description,
      date: new Date(Date.now() - Math.random() * 60 * 24 * 60 * 60 * 1000),
      nextAction: i % 2 === 0 ? 'Suivi par email' : null,
      nextActionDate: i % 2 === 0 ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) : null
    });

    await interaction.save();
  }

  console.log('  Created 5 interactions');
};

const seedSettings = async () => {
  const existing = await Settings.countDocuments();
  if (existing > 0) {
    console.log('  Settings already exist, skipping');
    return;
  }

  const company = await Company.findOne();
  
  await Settings.create({
    company: company ? {
      name: company.name,
      address: company.address,
      ice: company.ice,
      rc: company.rc,
      if: company.if,
      phone: company.phone,
      logoUrl: company.logoUrl || ''
    } : {
      name: 'Tech Solutions Maroc',
      address: 'Rabat',
      ice: '001781234567890',
      rc: 'Rabat-12345',
      if: '12345678',
      phone: '+212 5 37 00 00 00',
      logoUrl: ''
    },
    billing: {
      currency: 'MAD',
      vatRate: 20,
      invoiceFormat: 'FACT-{YYYY}-{0000}'
    },
    notifications: {
      firstReminder: 3,
      secondReminder: 7,
      smtpHost: 'smtp.techsolutions.ma'
    }
  });

  console.log('  Created default settings');
};

const seedAll = async () => {
  try {
    console.log('\n========================================');
    console.log('   FULL DATABASE SEED SCRIPT');
    console.log('========================================\n');

    console.log('Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('Connected successfully\n');

    console.log('Step 1: Clearing existing data...');
    await clearCollections();
    console.log('');

    console.log('Step 2: Seeding Users...');
    const users = await seedUsers();

    console.log('Step 3: Seeding Companies...');
    const companies = await seedCompanies();

    console.log('Step 4: Seeding Payment Gateways...');
    await seedPaymentGateways();

    console.log('Step 5: Seeding Products...');
    const products = await seedProducts();

    console.log('Step 6: Seeding Clients...');
    const clients = await seedClients();

    console.log('Step 7: Seeding Invoices...');
    const invoices = await seedInvoices(clients, products);

    console.log('Step 8: Seeding Payments...');
    await seedPayments(invoices, clients);

    console.log('Step 9: Seeding Expenses...');
    await seedExpenses();

    console.log('Step 10: Seeding Reminders...');
    await seedReminders(clients, invoices);

    console.log('Step 11: Seeding Interactions...');
    await seedInteractions(clients);

    console.log('Step 12: Seeding Settings...');
    await seedSettings();

    console.log('\n========================================');
    console.log('   SEED COMPLETED SUCCESSFULLY');
    console.log('========================================\n');

    console.log('Sample login credentials:');
    console.log('  Admin:     admin@crm.fr / admin123');
    console.log('  Comptable: comptable@crm.fr / comptable123\n');

  } catch (error) {
    console.error('\n❌ Seed Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
    process.exit(0);
  }
};

seedAll();
