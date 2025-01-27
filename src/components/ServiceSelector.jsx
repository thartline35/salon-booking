import React from 'react';
import { SERVICES } from '../data/services';

const ServiceSelector = ({ onServiceSelect }) => {
  const categories = Object.keys(SERVICES);

  return (
    <div className="space-y-6">
      {categories.map(category => (
        <div key={category} className="border rounded-lg p-4 bg-blue-300">
          <h3 className="font-bold text-lg mb-3 capitalize">{category}</h3>
          <div className="grid gap-2">
            {SERVICES[category].map(service => (
              <button
                key={service.id}
                onClick={() => onServiceSelect(service)}
                className="text-left p-3 bg-purple-200 hover:bg-purple-300 rounded border"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium">{service.name}</p>
                    <p className="text-sm text-gray-600">
                      Duration: {service.duration} minutes
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">
                      ${service.price}{service.variablePricing ? '+' : ''}
                    </p>
                    {service.note && (
                      <p className="text-xs text-gray-500">{service.note}</p>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default ServiceSelector;
   