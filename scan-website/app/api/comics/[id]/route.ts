import { NextResponse } from "next/server";
import { findComicById } from "@/lib/utils";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const comic = findComicById(id);

    if (!comic) {
      return NextResponse.json({ error: "Comic non trouvé" }, { status: 404 });
    }

    return NextResponse.json({ comic });
  } catch (error) {
    console.error("Erreur lors de la récupération du comic:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

