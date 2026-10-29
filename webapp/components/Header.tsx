import Link from "next/link"

const LIENS = [
    { libelle: "Mes notes", href: "/notes" },
    { libelle: "À valider", href: "/validation" },
]

export function Header({titre}: {titre: string}) {
    return(
        <header className="border-b border-slate-200 bg-white">
            <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
                <span className="font-semibold">{titre}</span>
                <nav className="flex gap-4 text-sm text-slate-600">
                    {LIENS.map((lien) => (
                        <Link key={lien.href} href={lien.href} className="hover:text-blue-700">
                            {lien.libelle}
                        </Link>
                    ))}
                </nav>
            </div>
        </header>
    )
}