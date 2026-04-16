import mongoose, { Schema } from "mongoose";

export interface ICounter {
  _id: mongoose.Types.ObjectId;
  key: string;
  seq: number;
}

const counterSchema = new Schema<ICounter>(
  {
    key: { type: String, required: true, unique: true },
    seq: { type: Number, default: 0 },
  },
  { timestamps: false },
);

const Counter = mongoose.model<ICounter>("Counter", counterSchema);
export default Counter;

export const nextCounter = async (key: string): Promise<number> => {
  const doc = await Counter.findOneAndUpdate(
    { key },
    { $inc: { seq: 1 } },
    { new: true, upsert: true },
  );
  return doc.seq;
};
