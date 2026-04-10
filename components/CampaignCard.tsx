'use client';

import React from 'react';
import { Campaign } from '@/types';
import { cn } from '@/lib/utils';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';

export interface CampaignCardProps {
  campaign: Campaign;
  onView?: (id: string) => void;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  className?: string;
}

const CampaignCard: React.FC<CampaignCardProps> = ({
  campaign,
  onView,
  onEdit,
  onDelete,
  className,
}) => {
  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('es-AR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusConfig = (status: string) => {
    const configs: Record<string, { label: string; color: string; bgColor: string }> = {
      intake: { label: 'Intake', color: 'text-gray-700', bgColor: 'bg-gray-100' },
      strategist: { label: 'Estrategia', color: 'text-blue-700', bgColor: 'bg-blue-100' },
      researcher: { label: 'Investigación', color: 'text-purple-700', bgColor: 'bg-purple-100' },
      copywriter: { label: 'Copywriting', color: 'text-indigo-700', bgColor: 'bg-indigo-100' },
      completed: { label: 'Completada', color: 'text-green-700', bgColor: 'bg-green-100' },
    };
    return configs[status] || configs.intake;
  };

  const calculateProgress = () => {
    const stages = ['intake', 'strategist', 'researcher', 'copywriter', 'completed'];
    const currentIndex = stages.indexOf(campaign.status);
    return ((currentIndex + 1) / stages.length) * 100;
  };

  const statusConfig = getStatusConfig(campaign.status);
  const progress = calculateProgress();

  const handleCardClick = () => {
    if (onView) {
      onView(campaign.id);
    }
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onEdit) {
      onEdit(campaign.id);
    }
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDelete) {
      onDelete(campaign.id);
    }
  };

  return (
    <Card
      className={cn('hover:shadow-lg transition-all duration-200', className)}
      onClick={onView ? handleCardClick : undefined}
      padding="none"
    >
      <div className="p-4 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-gray-900 truncate">
              {campaign.name}
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              Creada el {formatDate(campaign.created_at)}
            </p>
          </div>
          
          <span
            className={cn(
              'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap',
              statusConfig.color,
              statusConfig.bgColor
            )}
          >
            {statusConfig.label}
          </span>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600 font-medium">Progreso</span>
            <span className="text-gray-900 font-semibold">{Math.round(progress)}%</span>
          </div>
          
          <div className="relative w-full h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
              role="progressbar"
              aria-valuenow={Math.round(progress)}
              aria-valuemin={0}
              aria-valuemax={100}
            />
          </div>
        </div>

        {campaign.intake_data && (
          <div className="pt-3 border-t border-gray-100">
            <p className="text-sm text-gray-600 line-clamp-2">
              {typeof campaign.intake_data === 'string' 
                ? campaign.intake_data 
                : campaign.intake_data.businessDescription || 'Sin descripción'}
            </p>
          </div>
        )}

        <div className="flex items-center gap-2 pt-2">
          <Button
            variant="primary"
            size="sm"
            onClick={handleCardClick}
            className="flex-1"
          >
            Ver detalles
          </Button>
          
          {onEdit && (
            <Button
              variant="secondary"
              size="sm"
              onClick={handleEditClick}
              className="px-3"
              aria-label="Editar campaña"
            >
              <svg
                className="w-4 h-4"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
              </svg>
            </Button>
          )}
          
          {onDelete && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDeleteClick}
              className="px-3 text-red-600 hover:bg-red-50"
              aria-label="Eliminar campaña"
            >
              <svg
                className="w-4 h-4"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
};

export { CampaignCard };
export default CampaignCard;
