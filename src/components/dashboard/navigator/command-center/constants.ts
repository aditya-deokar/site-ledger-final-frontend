import {
  ArrowUpRight,
  BriefcaseBusiness,
  Building,
  Building2,
  CalendarDays,
  Contact2,
  Eye,
  Hammer,
  IndianRupee,
  Pencil,
  TrendingUp,
  UserPlus,
  Users,
  Trash2,
  Wrench,
} from 'lucide-react';

import type { CategoryDef } from './types';

export const CATEGORIES: CategoryDef[] = [
  {
    id: 'sites', label: 'Sites', shortcut: '1', icon: Building2,
    color: 'text-blue-500', bg: 'bg-blue-500/10', border: 'border-blue-500/30',
    actions: [
      { id: 'create-site', label: 'Create New Site', shortcut: '1', icon: Building2 },
      { id: 'book-flat', label: 'Book Flat', shortcut: '2', icon: UserPlus },
      { id: 'add-site-expense', label: 'Add Site Expense', shortcut: '3', icon: IndianRupee },
      { id: 'manage-funds', label: 'Manage Funds (Pull/Add)', shortcut: '4', icon: IndianRupee },
      { id: 'archive-site', label: 'Archive/Restore Site', shortcut: '5', icon: Pencil },
      { id: 'delete-site', label: 'Delete Site', shortcut: '6', icon: Hammer },
    ],
  },
  {
    id: 'company', label: 'Company', shortcut: '2', icon: Users,
    color: 'text-violet-500', bg: 'bg-violet-500/10', border: 'border-violet-500/30',
    actions: [
      { id: 'add-partner', label: 'Add Partner', shortcut: '1', icon: UserPlus },
      { id: 'edit-partner', label: 'Edit Partner', shortcut: '2', icon: Pencil },
      { id: 'delete-partner', label: 'Delete Partner', shortcut: '3', icon: Hammer },
      { id: 'edit-company', label: 'Edit Company Details', shortcut: '4', icon: Building },
      { id: 'withdraw-fund', label: 'Withdraw Fund', shortcut: '5', icon: ArrowUpRight },
    ],
  },
  {
    id: 'investors', label: 'Investors', shortcut: '3', icon: TrendingUp,
    color: 'text-emerald-500', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30',
    actions: [
      { id: 'add-investor', label: 'Add Investor', shortcut: '1', icon: TrendingUp },
      { id: 'edit-investor', label: 'Edit Investor', shortcut: '2', icon: Pencil },
      { id: 'delete-investor', label: 'Delete Investor', shortcut: '3', icon: Hammer },
    ],
  },
  {
    id: 'vendors', label: 'Vendors', shortcut: '4', icon: Wrench,
    color: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-500/30',
    actions: [
      { id: 'add-vendor', label: 'Add Vendor', shortcut: '1', icon: Wrench },
      { id: 'edit-vendor', label: 'Edit Vendor', shortcut: '2', icon: Pencil },
      { id: 'delete-vendor', label: 'Delete Vendor', shortcut: '3', icon: Hammer },
    ],
  },
  {
    id: 'customers', label: 'Customers', shortcut: '5', icon: Contact2,
    color: 'text-orange-500', bg: 'bg-orange-500/10', border: 'border-orange-500/30',
    actions: [
      { id: 'edit-customer', label: 'Edit Customer', shortcut: '1', icon: Pencil },
      { id: 'record-payment', label: 'Record Payment', shortcut: '2', icon: IndianRupee },
      { id: 'cancel-deal', label: 'Cancel Deal', shortcut: '3', icon: Hammer },
    ],
  },
  {
    id: 'employees', label: 'Employees', shortcut: '6', icon: BriefcaseBusiness,
    color: 'text-cyan-500', bg: 'bg-cyan-500/10', border: 'border-cyan-500/30',
    actions: [
      { id: 'add-employee', label: 'Add Employee', shortcut: '1', icon: UserPlus },
      { id: 'view-employee-details', label: 'View Employee Details', shortcut: '2', icon: Eye },
      { id: 'edit-employee', label: 'Edit Employee', shortcut: '3', icon: Pencil },
      { id: 'delete-employee', label: 'Delete Employee', shortcut: '4', icon: Trash2 },
      { id: 'mark-employee-attendance', label: 'Take Attendance', shortcut: '5', icon: CalendarDays },
      { id: 'pay-salary', label: 'Pay Salary', shortcut: '6', icon: IndianRupee },
    ],
  },
];

export const ACTIONS_NEEDING_SELECTOR = [
  'book-flat', 'add-site-expense', 'manage-funds', 'archive-site', 'delete-site',
  'edit-partner', 'delete-partner',
  'edit-investor', 'delete-investor',
  'edit-vendor', 'delete-vendor',
  'edit-customer', 'record-payment', 'cancel-deal',
  'view-employee-details', 'edit-employee', 'delete-employee',
  'mark-employee-attendance', 'pay-salary',
];

export const ACTIONS_NEEDING_SUB_SELECTOR = ['record-payment'];
export const ACTIONS_USING_SITE_SELECTOR = ['book-flat', 'add-site-expense', 'manage-funds', 'archive-site', 'delete-site', 'record-payment'];
export const COMMON_UNIT_TYPES = ['1RK', '1BHK', '2BHK', '2.5BHK', '3BHK', '4BHK', 'DUPLEX', 'PENTHOUSE'] as const;
export const UNIT_TYPE_PICK_OPTIONS = [...COMMON_UNIT_TYPES, 'CUSTOM'] as const;
export const COMMON_VENDOR_CATEGORIES = ['MATERIALS', 'LABOR', 'CONTRACTOR', 'TRANSPORT', 'ELECTRICAL', 'PLUMBING', 'MASONRY', 'CARPENTRY'] as const;
export const BOOKING_AGREEMENT_LINE_TYPES = ['CHARGE', 'TAX', 'DISCOUNT', 'CREDIT'] as const;

export const INPUT_CLS = 'h-12 w-full bg-muted border-2 border-transparent rounded-none px-4 text-sm font-bold tracking-widest text-foreground placeholder:text-muted-foreground/30 outline-none focus:bg-card focus:border-primary focus:ring-2 focus:ring-primary/30 transition-all';
export const LABEL_CLS = 'text-[10px] font-bold uppercase tracking-widest text-foreground/40';
