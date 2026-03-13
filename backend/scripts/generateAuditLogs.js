const mongoose = require('mongoose');
const dotenv = require('dotenv').config();

const Client = require('../models/ClientSchema');
const Invoice = require('../models/InvoiceSchema');
const Product = require('../models/ProductSchema');
const Expense = require('../models/ExpenseSchema');
const AuditLog = require('../models/AuditLogSchema');

const MONGODB_URI = process.env.MONGODB_URI || process.env.DB_HOST || 'mongodb://localhost:27017/crm';

async function generateAuditLogs() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    const entities = [
      { name: 'Client', Model: Client },
      { name: 'Invoice', Model: Invoice },
      { name: 'Product', Model: Product },
      { name: 'Expense', Model: Expense },
    ];

    let totalCreated = 0;

    for (const { name, Model } of entities) {
      console.log(`\nProcessing ${name}s...`);
      
      const documents = await Model.find({});
      console.log(`Found ${documents.length} ${name}(s)`);

      let created = 0;
      let skipped = 0;

      for (const doc of documents) {
        const existingLog = await AuditLog.findOne({
          entity: name,
          entityId: doc._id,
          action: 'create'
        });

        if (existingLog) {
          skipped++;
          continue;
        }

        const docObj = doc.toObject();
        delete docObj.__v;

        await AuditLog.create({
          action: 'create',
          entity: name,
          entityId: doc._id,
          changes: docObj,
          userId: null,
          ipAddress: 'system-migration',
          userAgent: 'migration-script',
          createdAt: doc.createdAt || new Date()
        });

        created++;
        totalCreated++;
      }

      console.log(`  Created: ${created}, Skipped (already exists): ${skipped}`);
    }

    console.log(`\n========================================`);
    console.log(`Total audit logs created: ${totalCreated}`);
    console.log(`Migration completed successfully!`);

  } catch (error) {
    console.error('Migration error:', error.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

generateAuditLogs();
