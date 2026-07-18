export type AirFill = { id: number; filled_at: string };
export type FuelItem = {
  fuel_type: string;
  fill_type: string;
  quantity: number;
  unit_price: number;
  total_cost: number;
};
export type FuelFill = {
  id: number;
  odometer_km: number;
  filled_at: string;
  station_name: string | null;
  notes: string | null;
  items: FuelItem[];
};
