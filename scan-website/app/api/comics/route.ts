import { NextResponse } from "next/server";
import { getAllComics } from "@/lib/utils";

export async function GET() {
  try {
    const comics = getAllComics();
    return NextResponse.json({ comics });
  } catch (error) {
    console.error("Erreur lors de la récupération des comics:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

