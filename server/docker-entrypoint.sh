#!/bin/sh
set -e

echo "Running Prisma migrations..."
npx prisma db push --schema=./prisma/schema.prisma

echo "Seeding students..."
node scripts/seedStudentsFromSheets.js || echo "Warning: seed:students failed, continuing..."

echo "Seeding faculty..."
node scripts/seedFaculty.js || echo "Warning: seed:faculty failed, continuing..."

echo "Seeding faculty advisors..."
node scripts/seedFacultyAdvisors.js || echo "Warning: seed:advisors failed, continuing..."

echo "Seeding courses..."
node scripts/parseCourses.js || echo "Warning: seed:courses failed, continuing..."

echo "Seeding admin..."
node scripts/seedAdmin.js || echo "Warning: seed:admin failed, continuing..."

echo "Seeding complete. Starting server..."
exec pm2-runtime start index.js
