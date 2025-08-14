<?php

// ---- CONNEXION BDD ----
$db = new PDO('sqlite:/home/debian/gotin/data/montres.sqlite');
$db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);


$sql = "
    SELECT sh.*, m.nom, m.reference
    FROM stock_history sh
    LEFT JOIN montres m ON m.id = sh.montre_id
    ORDER BY sh.created_at DESC
";
$rows = $db->query($sql)->fetchAll(PDO::FETCH_ASSOC);

?>
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <title>Historique des mouvements de stock</title>
    <link rel="stylesheet" href="styles/crud.css">
    <style>
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }
        th { background: #f0f0f0; }
        .delta-pos { color: green; font-weight: bold; }
        .delta-neg { color: red; font-weight: bold; }
    </style>
</head>
<body>
    <h1>Historique des mouvements de stock</h1>
    <table>
        <thead>
            <tr>
                <th>Date</th>
                <th>Montre</th>
                <th>Référence</th>
                <th>Variation</th>
                <th>Raison</th>
            </tr>
        </thead>
        <tbody>
        <?php foreach ($rows as $row): ?>
            <tr>
                <td><?= htmlspecialchars($row['created_at']) ?></td>
                <td><?= htmlspecialchars($row['nom']) ?></td>
                <td><?= htmlspecialchars($row['reference']) ?></td>
                <td class="<?= $row['delta'] >= 0 ? 'delta-pos' : 'delta-neg' ?>">
                    <?= $row['delta'] >= 0 ? '+' . $row['delta'] : $row['delta'] ?>
                </td>
                <td><?= htmlspecialchars($row['reason']) ?></td>
            </tr>
        <?php endforeach; ?>
        </tbody>
    </table>

    <p><a href="crud.html">⬅ Retour au CRUD</a></p>
</body>
</html>
