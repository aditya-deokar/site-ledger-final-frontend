'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Users, Edit, Trash2, Plus, Search, Store, Wallet, Shield } from 'lucide-react';
import { TRANSACTION_TYPES, TRANSACTION_DISPLAY_INFO } from '@/types/transactions.types';

interface Entity {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  type: string;
  lastUpdated?: string;
  balance?: number;
  status?: 'active' | 'inactive';
}

interface EntityManagementDashboardProps {
  entityType: 'customer' | 'vendor' | 'investor' | 'partner';
  entities: Entity[];
  loading?: boolean;
  error?: string | null;
  onEdit?: (entity: Entity) => void;
  onDelete?: (entityId: string) => void;
  onCreate?: () => void;
  onRefresh?: () => void;
}

export function EntityManagementDashboard({ 
  entityType, 
  entities, 
  loading, 
  error, 
  onEdit, 
  onDelete, 
  onCreate, 
  onRefresh 
}: EntityManagementDashboardProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEntity, setSelectedEntity] = useState<Entity | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const filteredEntities = entities.filter(entity =>
    entity.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getEntityTypeInfo = () => {
    switch (entityType) {
      case 'customer':
        return {
          title: 'Customers',
          createLabel: 'New Customer',
          createType: TRANSACTION_TYPES.CREATE_CUSTOMER,
          editType: TRANSACTION_TYPES.EDIT_CUSTOMER,
          deleteType: TRANSACTION_TYPES.DELETE_CUSTOMER,
          icon: 'Users',
          color: 'text-emerald-500',
          description: 'Manage your customer database'
        };
      case 'vendor':
        return {
          title: 'Vendors',
          createLabel: 'New Vendor',
          createType: TRANSACTION_TYPES.CREATE_VENDOR,
          editType: TRANSACTION_TYPES.EDIT_VENDOR,
          deleteType: TRANSACTION_TYPES.DELETE_VENDOR,
          icon: 'Store',
          color: 'text-purple-500',
          description: 'Manage your vendor database'
        };
      case 'investor':
        return {
          title: 'Investors',
          createLabel: 'New Investor',
          createType: TRANSACTION_TYPES.CREATE_INVESTOR,
          editType: TRANSACTION_TYPES.EDIT_INVESTOR,
          deleteType: TRANSACTION_TYPES.DELETE_INVESTOR,
          icon: 'Wallet',
          color: 'text-blue-500',
          description: 'Manage your investor database'
        };
      case 'partner':
        return {
          title: 'Partners',
          createLabel: 'New Partner',
          createType: TRANSACTION_TYPES.CREATE_PARTNER,
          editType: TRANSACTION_TYPES.EDIT_PARTNER,
          deleteType: TRANSACTION_TYPES.DELETE_PARTNER,
          icon: 'Shield',
          color: 'text-indigo-500',
          description: 'Manage your partner database'
        };
      default:
        return {
          title: 'Entities',
          createLabel: 'New Entity',
          createType: TRANSACTION_TYPES.CREATE_CUSTOMER,
          editType: TRANSACTION_TYPES.EDIT_CUSTOMER,
          deleteType: TRANSACTION_TYPES.DELETE_CUSTOMER,
          icon: 'Users',
          color: 'text-gray-500',
          description: 'Manage your entity database'
        };
    }
  };

  const entityInfo = getEntityTypeInfo();

  const handleEdit = (entity: Entity) => {
    setSelectedEntity(entity);
    onEdit?.(entity);
  };

  const handleDelete = (entityId: string) => {
    setSelectedEntity(entities.find(e => e.id === entityId) || null);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = () => {
    if (selectedEntity) {
      onDelete?.(selectedEntity.id);
      setShowDeleteConfirm(false);
      setSelectedEntity(null);
    }
  };

  const cancelDelete = () => {
    setShowDeleteConfirm(false);
    setSelectedEntity(null);
  };

  if (error) {
    return (
      <Alert className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/20">
        <AlertDescription className="text-red-800 dark:text-red-200">
          {error}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg ${entityInfo.color} bg-opacity-10 flex items-center justify-center`}>
            {entityInfo.icon === 'Users' ? <Users className="w-5 h-5" /> : entityInfo.icon === 'Store' ? <Store className="w-5 h-5" /> : entityInfo.icon === 'Wallet' ? <Wallet className="w-5 h-5" /> : entityInfo.icon === 'Shield' ? <Shield className="w-5 h-5" /> : <Users className="w-5 h-5" />}
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {entityInfo.title}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {entityInfo.description}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={onCreate}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            {entityInfo.createLabel}
          </Button>
          <Button
            onClick={onRefresh}
            variant="outline"
            size="sm"
          >
            <Search className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Search and Stats */}
      <Card>
        <CardContent>
          <div className="flex items-center gap-4 mb-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder={`Search ${entityInfo.title.toLowerCase()}...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border rounded-md focus:ring-2 focus:ring-primary focus:border-primary outline-none"
              />
            </div>
            <div className="text-sm text-gray-600">
              {filteredEntities.length} {entityInfo.title.toLowerCase()}
            </div>
          </div>
          <div className="text-sm text-gray-600">
            Total: {entities.length} {entityInfo.title.toLowerCase()}
          </div>
        </CardContent>
      </Card>

      {/* Entity List */}
      <Card>
        <CardHeader>
          <CardTitle>{entityInfo.title}</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : filteredEntities.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No {entityInfo.title.toLowerCase()} found</p>
              <p className="text-sm">Try adjusting your search terms</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredEntities.map((entity) => (
                <div
                  key={entity.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full ${entityInfo.color} bg-opacity-10 flex items-center justify-center`}>
                        <Users className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                          {entity.name}
                        </h3>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {entity.email && <div>{entity.email}</div>}
                          {entity.phone && <div>{entity.phone}</div>}
                          {entity.type && <Badge variant="secondary" className="mt-1">{entity.type}</Badge>}
                        </div>
                      </div>
                    </div>
                    <div className="text-right text-sm text-gray-500">
                      {entity.lastUpdated && (
                        <div className="text-xs">
                          Updated: {new Date(entity.lastUpdated).toLocaleDateString()}
                        </div>
                      )}
                      {entity.balance !== undefined && (
                        <div className="font-semibold">
                          Rs. {entity.balance.toLocaleString('en-IN')}
                        </div>
                      )}
                      {entity.status && (
                        <Badge 
                          variant={entity.status === 'active' ? 'default' : 'secondary'}
                          className="ml-2"
                        >
                          {entity.status}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        onClick={() => handleEdit(entity)}
                        variant="outline"
                        size="sm"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        onClick={() => handleDelete(entity.id)}
                        variant="outline"
                        size="sm"
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && selectedEntity && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl max-w-md mx-4">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center w-12 h-12 rounded-full bg-red-100 dark:bg-red-900 mb-4">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                Confirm Delete
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Are you sure you want to delete <span className="font-semibold">{selectedEntity.name}</span>?
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-500 mb-6">
                This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <Button
                  onClick={cancelDelete}
                  variant="outline"
                >
                  Cancel
                </Button>
                <Button
                  onClick={confirmDelete}
                  variant="destructive"
                >
                  Delete
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
