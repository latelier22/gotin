  function downloadProduitsCSV() {
    const headers = [
      "id",
      "reference",
      "nom",
      "prix",
      "description",
      "image1",
      "image2",
      "image3",
      "image4",
      "categorie",
      "etat",
      "status"
    ];

    const rows = montres.map(m =>
      headers.map(h => {
        const val = m[h] || "";
        const str = typeof val === "string"
          ? val
          : typeof val === "number"
            ? val.toString()
            : JSON.stringify(val);
        return `"${str.replace(/"/g, '""')}"`;
      }).join(",")
    );

    const csvContent = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });

    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "produits.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  



