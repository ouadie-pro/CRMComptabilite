require('dotenv').config();
const mongoose = require('mongoose');

const Company = require('../models/CompanySchema');
const Client = require('../models/ClientSchema');
const Invoice = require('../models/InvoiceSchema');
const User = require('../models/userSchema');
const PaymentGateway = require('../models/PaymentGatewaySchema');
const Payment = require('../models/PaymentSchema');
const Reminder = require('../models/ReminderSchema');
const Interaction = require('../models/InteractionSchema');

const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;

if (!mongoUri) {
  console.error('MONGO_URI not found in .env');
  process.exit(1);
}

mongoose.connect(mongoUri).then(() => console.log('Connected to MongoDB'));

async function seedData() {
  try {
    console.log('\n=== Starting Seed ===\n');

    // Seed Companies
    const companyCount = await Company.countDocuments();
    if (companyCount === 0) {
      const companies = [
        {
          name: 'Maroc Telecom SA',
          address: 'Avenue Annakhil, Hay Riad, Rabat',
          ice: '001781234567890',
          rc: 'Rabat-12345',
          if: '12345678',
          phone: '+212 5 37 00 00 00',
          currency: 'MAD',
          defaultVatRate: 20,
          invoiceNumberFormat: 'F-{YYYY}-{0000}'
        },
        {
          name: 'Attijariwafa Bank',
          address: '2 Boulevard Moulay Youssef, Casablanca',
          ice: '001782345678901',
          rc: 'Casablanca-67890',
          if: '23456789',
          phone: '+212 5 22 00 00 00',
          currency: 'MAD',
          defaultVatRate: 20,
          invoiceNumberFormat: 'F-{YYYY}-{0000}'
        }
      ];
      await Company.insertMany(companies);
      console.log('✓ Seeded 2 Companies');
    } else {
      console.log('✓ Companies already exist, skipping');
    }

    // Seed PaymentGateways
    const gatewayCount = await PaymentGateway.countDocuments();
    if (gatewayCount === 0) {
      const gateways = [
        {
          name: 'Stripe',
          type: 'stripe',
          isActive: false,
          apiKey: '',
          apiSecret: ''
        },
        {
          name: 'PayPal',
          type: 'paypal',
          isActive: true,
          apiKey: '',
          apiSecret: ''
        }
      ];
      await PaymentGateway.insertMany(gateways);
      console.log('✓ Seeded 2 PaymentGateways');
    } else {
      console.log('✓ PaymentGateways already exist, skipping');
    }

    // Fetch existing data for relationships
    const clients = await Client.find().limit(10);
    const invoices = await Invoice.find().limit(10);
    const users = await User.find().limit(5);

    if (clients.length === 0) {
      console.log('⚠ No clients found. Run client seed first or create clients manually.');
    }

    if (invoices.length === 0) {
      console.log('⚠ No invoices found. Run invoice seed first or create invoices manually.');
    }

    if (users.length === 0) {
      console.log('⚠ No users found. Please create users manually.');
    }

    // Seed Interactions
    const interactionCount = await Interaction.countDocuments();
    if (interactionCount === 0 && clients.length > 0 && users.length > 0) {
      const interactions = [];
      const types = ['call', 'email', 'meeting', 'note'];
      const subjects = [
        'Discussion sur le nouveau projet',
        'Suivi commande',
        'Réunion de présentation',
        'Appel de suivi',
        'Envoi devis',
        'Négociation contrat',
        'Support technique',
        'Renouvellement contrat',
        'Point hebdomadaire',
        'Présentation nouveaux services'
      ];
      const descriptions = [
        'Discussion fructueuse sur les besoins du client.',
        'Le client a confirmé sa commande.',
        'Présentation des nouvelles fonctionnalités.',
        'Appel de routine pour le suivi.',
        'Devis envoyé par email.',
        'Négociation en cours pour le nouveau contrat.',
        'Support demandé pour un problème technique.',
        'Le contrat arrive à échéance, renouvellement prévu.',
        'Point hebdomadaire sur l\'avancement du projet.',
        'Présentation des nouveaux services disponibles.'
      ];

      for (let i = 0; i < 10; i++) {
        const daysAgo = Math.floor(Math.random() * 60);
        interactions.push({
          clientId: clients[i % clients.length]._id,
          userId: users[i % users.length]._id,
          type: types[i % types.length],
          subject: subjects[i],
          description: descriptions[i],
          date: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000),
          nextAction: i % 2 === 0 ? 'Suivi par email' : null,
          nextActionDate: i % 2 === 0 ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) : null
        });
      }
      await Interaction.insertMany(interactions);
      console.log('✓ Seeded 10 Interactions');
    } else {
      console.log('✓ Interactions already exist or no data to link, skipping');
    }

    // Seed Payments
    const paymentCount = await Payment.countDocuments();
    if (paymentCount === 0 && invoices.length > 0 && clients.length > 0) {
      const payments = [];
      const methods = ['virement', 'carte', 'cheque', 'paypal'];

      for (let i = 0; i < 5; i++) {
        const daysAgo = Math.floor(Math.random() * 30);
        payments.push({
          invoiceId: invoices[i % invoices.length]._id,
          clientId: clients[i % clients.length]._id,
          amount: Math.floor(Math.random() * 10000) + 1000,
          method: methods[i % methods.length],
          paidAt: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000),
          reference: `REF-${Date.now()}-${i}`
        });
      }
      const insertedPayments = await Payment.insertMany(payments);
      console.log('✓ Seeded 5 Payments');
    } else {
      console.log('✓ Payments already exist or no data to link, skipping');
    }

    // Seed Reminders
    const reminderCount = await Reminder.countDocuments();
    if (reminderCount === 0 && invoices.length > 0 && clients.length > 0) {
      const reminders = [];
      const types = ['payment', 'followup', 'renewal'];

      for (let i = 0; i < 5; i++) {
        const daysAhead = Math.floor(Math.random() * 14) + 1;
        reminders.push({
          clientId: clients[i % clients.length]._id,
          invoiceId: invoices[i % invoices.length]._id,
          type: types[i % types.length],
          scheduledDate: new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000),
          status: 'pending',
          message: `Rappel ${types[i % types.length]} - Facture ${invoices[i % invoices.length].number}`
        });
      }
      await Reminder.insertMany(reminders);
      console.log('✓ Seeded 5 Reminders');
    } else {
      console.log('✓ Reminders already exist or no data to link, skipping');
    }

    console.log('\n=== Seed Complete ===\n');
  } catch (error) {
    console.error('Seed error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
    process.exit(0);
  }
}

seedData();
