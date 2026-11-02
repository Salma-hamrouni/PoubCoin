export interface Municipality {
  id: string;
  name: string;
  governorate: string;
  latitude: number;
  longitude: number;
  address?: string;
  phone?: string;
  fax?: string;
  email?: string;
}

export const MUNICIPALITIES: Municipality[] = [
  // ── Tunis ──────────────────────────────────────────────────────────────────
  { id: 'tunis',                  name: 'Tunis',                  governorate: 'Tunis',       latitude: 36.8190, longitude: 10.1658, address: 'Place Rue 2 Mars 1934, 1080 La Casbah, Tunis',         phone: '71.571.198', fax: '71.562.183' },
  { id: 'la_marsa',               name: 'La Marsa',               governorate: 'Tunis',       latitude: 36.8783, longitude: 10.3253, address: 'Rue de la Liberté, Palais Bonheur, La Marsa',           phone: '71.775.010', fax: '71.743.406' },
  { id: 'carthage',               name: 'Carthage',               governorate: 'Tunis',       latitude: 36.8586, longitude: 10.3232, address: 'Rue Sophonibale Hannibal',                              phone: '71.731.460', fax: '71.731.972' },
  { id: 'sidi_bou_said',          name: 'Sidi Bou Saïd',          governorate: 'Tunis',       latitude: 36.8703, longitude: 10.3414, address: '1 Rue Habib Thameur, Sidi Bou Saïd',                   phone: '71.745.132', fax: '71.949.079' },
  { id: 'le_kram',                name: 'Le Kram',                governorate: 'Tunis',       latitude: 36.8372, longitude: 10.2886, address: '11 Rue Mohamed V, 2089 Le Kram',                        phone: '71.977.906', fax: '71.977.907' },
  { id: 'le_bardo',               name: 'Bardo',                  governorate: 'Tunis',       latitude: 36.8094, longitude: 10.1381, address: 'Rue de l\'Indépendance, Bardo',                        phone: '71.571.198', fax: '71.562.183' },
  { id: 'la_goulette',            name: 'La Goulette',            governorate: 'Tunis',       latitude: 36.8178, longitude: 10.3047, address: 'Rue 2 Mars 1934, La Goulette',                          phone: '71.735.333', fax: '71.735.708' },
  { id: 'sidi_hassine',           name: 'Sidi Hassine',           governorate: 'Tunis',       latitude: 36.8150, longitude: 10.0950, address: 'Route El Attar',                                       phone: '71.591.430', fax: '71.591.690' },

  // ── Ariana ─────────────────────────────────────────────────────────────────
  { id: 'ariana',                 name: 'Ariana',                 governorate: 'Ariana',      latitude: 36.8665, longitude: 10.1647, address: 'Rue 18 Janvier 1952',                                  phone: '71.711.100', fax: '71.718.425' },
  { id: 'la_soukra',              name: 'Soukra',                 governorate: 'Ariana',      latitude: 36.8981, longitude: 10.2375, address: 'Rue El Menzah',                                        phone: '70.949.655', fax: '70.949.295' },
  { id: 'raoued',                 name: 'Raoued',                 governorate: 'Ariana',      latitude: 36.8916, longitude: 10.2148, address: 'Cité El Wafa',                                         phone: '70.685.488', fax: '70.685.905' },
  { id: 'sidi_thabet',            name: 'Sidi Thabet',            governorate: 'Ariana',      latitude: 36.9167, longitude: 10.0667, address: 'Rue Habib Bourguiba',                                  phone: '71.552.086', fax: '71.552.166' },
  { id: 'kalaat_el_andalous',     name: 'Kalaat El Andalous',     governorate: 'Ariana',      latitude: 37.0000, longitude: 10.0667, address: 'Rue Habib Bourguiba',                                  phone: '71.558.224', fax: '71.558.224' },
  { id: 'ettadhamen_mnihla',      name: 'Ettadhamen-Mnihla',      governorate: 'Ariana',      latitude: 36.8811, longitude: 10.1797, address: 'Rue de l\'Environnement, Cité El Tadhamen',            phone: '71.545.630', fax: '71.549.953' },

  // ── Manouba ────────────────────────────────────────────────────────────────
  { id: 'manouba',                name: 'Manouba',                governorate: 'Manouba',     latitude: 36.8081, longitude: 10.0975, address: '13 Rue Hédi Chaker',                                   phone: '71.600.397', fax: '71.600.425' },
  { id: 'den_den',                name: 'Den Den',                governorate: 'Manouba',     latitude: 36.8192, longitude: 10.1275, address: '37 Rue de l\'Indépendance',                            phone: '70.605.317', fax: '70.605.170' },
  { id: 'douar_hicher',           name: 'Douar Hicher',           governorate: 'Manouba',     latitude: 36.8172, longitude: 10.1119, address: 'Rue Mongi Slim',                                       phone: '71.622.500', fax: '71.621.453' },
  { id: 'oued_ellil',             name: 'Oued Ellil',             governorate: 'Manouba',     latitude: 36.8228, longitude: 10.0594, address: 'Rue Habib Bourguiba',                                  phone: '71.535.150', fax: '71.535.572' },
  { id: 'jedaida',                name: 'Jedaida',                governorate: 'Manouba',     latitude: 36.8300, longitude: 9.9100,  address: 'Rue Habib Bourguiba',                                  phone: '71.539.153', fax: '71.539.211' },
  { id: 'tebourba',               name: 'Tebourba',               governorate: 'Manouba',     latitude: 36.8569, longitude: 9.8439,  address: 'Rue Habib Bourguiba',                                  phone: '71.530.322', fax: '71.633.318' },
  { id: 'el_battan',              name: 'El Battan',              governorate: 'Manouba',     latitude: 36.8450, longitude: 9.9750,  address: 'Rue de l\'Environnement',                              phone: '71.640.552', fax: '71.640.500' },
  { id: 'borj_el_amri',           name: 'Borj El Amri',           governorate: 'Manouba',     latitude: 36.9583, longitude: 9.9833,  address: '10 Rue de la République',                              phone: '71.542.040', fax: '71.542.040' },
  { id: 'mornaguia',              name: 'Mornaguia',              governorate: 'Manouba',     latitude: 36.7667, longitude: 10.0500, address: 'Rue Habib Bourguiba',                                  phone: '71.540.354', fax: '71.540.645' },

  // ── Ben Arous ──────────────────────────────────────────────────────────────
  { id: 'ben_arous',              name: 'Ben Arous',              governorate: 'Ben Arous',   latitude: 36.7533, longitude: 10.2289, address: 'Rue de la République, 2013 Ben Arous',                 phone: '71.383.187', fax: '71.381.088' },
  { id: 'el_mourouj',             name: 'El Mourouj',             governorate: 'Ben Arous',   latitude: 36.7200, longitude: 10.2033, address: 'Rue des Martyrs, El Mourouj 1',                        phone: '71.363.147', fax: '71.363.528' },
  { id: 'megrine',                name: 'Mégrine',                governorate: 'Ben Arous',   latitude: 36.7656, longitude: 10.2481, address: 'Rue Bachir Sfar, Mégrine 2033',                        phone: '71.434.300', fax: '71.433.181' },
  { id: 'rades',                  name: 'Radès',                  governorate: 'Ben Arous',   latitude: 36.7706, longitude: 10.2780, address: 'Place de la République, 2040 Radès',                   phone: '71.441.800', fax: '71.442.550' },
  { id: 'hammam_lif',             name: 'Hammam Lif',             governorate: 'Ben Arous',   latitude: 36.7294, longitude: 10.3347, address: 'Rue de la République, 2050 Hammam Lif',                phone: '79.218.007', fax: '79.218.110' },
  { id: 'hammam_chott',           name: 'Hammam Chott',           governorate: 'Ben Arous',   latitude: 36.7047, longitude: 10.3647, address: 'Place Rue des Martyrs, 1165 Hammam Chott',             phone: '71.434.500', fax: '71.431.610' },
  { id: 'ezzahra',                name: 'Ezzahra',                governorate: 'Ben Arous',   latitude: 36.7419, longitude: 10.2994, address: 'Rue Hédi Chaker N°1, 2034 Ezzahra',                   phone: '71.454.400', fax: '71.482.829' },
  { id: 'mornag',                 name: 'Mornag',                 governorate: 'Ben Arous',   latitude: 36.6781, longitude: 10.2864, address: 'Rue Bourguiba',                                        phone: '71.360.334', fax: '71.360.466' },
  { id: 'boumhel',                name: 'Boumhel El Bassatine',   governorate: 'Ben Arous',   latitude: 36.7167, longitude: 10.2833, address: 'Rue des Martyrs, 2097 Boumhel',                        phone: '71.216.466', fax: '71.217.550' },
  { id: 'mohamedia_fouchana',     name: 'Mohamedia-Fouchana',     governorate: 'Ben Arous',   latitude: 36.6883, longitude: 10.1617, address: 'Rue des Martyrs 1145',                                 phone: '71.394.299', fax: '71.394.140' },
  { id: 'khlidia',                name: 'Khlidia',                governorate: 'Ben Arous',   latitude: 36.6650, longitude: 10.2200, address: 'Rue Bourguiba',                                        phone: '71.366.375', fax: '71.366.232' },

  // ── Nabeul ─────────────────────────────────────────────────────────────────
  { id: 'nabeul',                 name: 'Nabeul',                 governorate: 'Nabeul',      latitude: 36.4566, longitude: 10.7359, address: 'Rue Mohamed V, Nabeul 8000',                           phone: '72.285.010', fax: '72.271.482' },
  { id: 'dar_chaabane',           name: 'Dar Chaabane El Fehri',  governorate: 'Nabeul',      latitude: 36.5228, longitude: 10.7781, address: 'Rue Habib Bourguiba, Dar Chaabane 8011',               phone: '72.363.702', fax: '72.361.211' },
  { id: 'beni_khiar',             name: 'Beni Khiar',             governorate: 'Nabeul',      latitude: 36.4850, longitude: 10.7900, address: 'Place de l\'Indépendance, Beni Khiar 8060',            phone: '72.229.016', fax: '72.229.177' },
  { id: 'somaa',                  name: 'Somâa',                  governorate: 'Nabeul',      latitude: 36.5567, longitude: 10.8167, address: 'Rue de l\'Indépendance',                              phone: '72.355.316', fax: '72.355.265' },
  { id: 'maamoura',               name: 'Maamoura',               governorate: 'Nabeul',      latitude: 36.5500, longitude: 10.8400, address: 'Rue 9 Avril, 8013 Maamoura',                           phone: '72.369.334', fax: '72.369.996' },
  { id: 'tazarka',                name: 'Tazarka',                governorate: 'Nabeul',      latitude: 36.5517, longitude: 10.8683, address: 'Rue Habib Bourguiba',                                  phone: '72.225.050', fax: '72.225.496' },
  { id: 'korba',                  name: 'Korba',                  governorate: 'Nabeul',      latitude: 36.5706, longitude: 10.8631, address: 'Rue Taïeb Méhiri, 8070 Korba',                         phone: '72.384.550', fax: '72.384.440' },
  { id: 'mida',                   name: 'Mida',                   governorate: 'Nabeul',      latitude: 36.6083, longitude: 10.9117, address: 'Rue de l\'Environnement, Mida 8044',                   phone: '72.297.616', fax: '72.297.747' },
  { id: 'menzel_horr',            name: 'Menzel Horr',            governorate: 'Nabeul',      latitude: 36.6667, longitude: 10.9500, address: 'Rue des Martyrs',                                      phone: '72.339.204', fax: '72.339.449' },
  { id: 'menzel_temime',          name: 'Menzel Temime',          governorate: 'Nabeul',      latitude: 36.7781, longitude: 10.9814, address: 'Rue Habib Bourguiba, Menzel Temime',                   phone: '72.344.204', fax: '72.344.226' },
  { id: 'kelibia',                name: 'Kelibia',                governorate: 'Nabeul',      latitude: 36.8481, longitude: 11.0947, address: 'Rue Habib Bourguiba, 8090 Kelibia',                    phone: '72.296.239', fax: '72.296.460' },
  { id: 'azmour',                 name: 'Azmour',                 governorate: 'Nabeul',      latitude: 36.8033, longitude: 11.0667, address: '2 Rue Ali Belhouane, Azmour 8035',                     phone: '72.332.369', fax: '72.332.372' },
  { id: 'hammam_ghezeze',         name: 'Hammam Ghezèze',         governorate: 'Nabeul',      latitude: 36.7483, longitude: 11.0300, address: 'Place Rue des Martyrs',                                phone: '72.330.371', fax: '72.330.618' },
  { id: 'dar_allouche',           name: 'Dar Allouche',           governorate: 'Nabeul',      latitude: 36.7083, longitude: 11.0517, address: '2 Rue des Oliviers, Dar Allouche 8055',                phone: '72.294.116', fax: '72.294.116' },
  { id: 'el_haouaria',            name: 'El Haouaria',            governorate: 'Nabeul',      latitude: 37.0500, longitude: 11.0000, address: 'Rue Ibn Sina, El Haouaria 8045',                       phone: '72.297.031', fax: '72.297.287' },
  { id: 'takelsa',                name: 'Takelsa',                governorate: 'Nabeul',      latitude: 36.8167, longitude: 10.6833, address: 'Rue de l\'Environnement, Bir Marwa',                   phone: '72.396.117', fax: '72.396.395' },
  { id: 'korbous',                name: 'Korbous',                governorate: 'Nabeul',      latitude: 36.7933, longitude: 10.5717, address: 'Rue des Martyrs, Korbous 8041',                        phone: '72.284.525', fax: '72.284.702' },
  { id: 'soliman',                name: 'Soliman',                governorate: 'Nabeul',      latitude: 36.6933, longitude: 10.4883, address: 'Place de l\'Indépendance',                             phone: '72.290.299', fax: '72.290.305' },
  { id: 'menzel_bouzelfa',        name: 'Menzel Bouzelfa',        governorate: 'Nabeul',      latitude: 36.6767, longitude: 10.5367, address: 'Rue Habib Bourguiba, Menzel Bouzelfa 8010',            phone: '72.292.002', fax: '72.292.320' },
  { id: 'beni_khalled',           name: 'Beni Khalled',           governorate: 'Nabeul',      latitude: 36.6467, longitude: 10.5833, address: 'Rue Habib Bourguiba, Beni Khalled 8021',               phone: '72.371.005', fax: '72.371.438' },
  { id: 'zaouiet_jedidi',         name: 'Zaouiet Jedidi',         governorate: 'Nabeul',      latitude: 36.5667, longitude: 10.6167, address: 'Rue 20 Mars 8099',                                     phone: '72.370.988', fax: '72.371.592' },
  { id: 'grombalia',              name: 'Grombalia',              governorate: 'Nabeul',      latitude: 36.5983, longitude: 10.5033, address: 'Rue de la Paix 8030',                                  phone: '72.255.021', fax: '72.256.311' },
  { id: 'bou_argoub',             name: 'Bou Argoub',             governorate: 'Nabeul',      latitude: 36.5350, longitude: 10.5583, address: 'Rue des Martyrs, Bou Argoub',                          phone: '72.259.504', fax: '72.259.545' },
  { id: 'hammamet',               name: 'Hammamet',               governorate: 'Nabeul',      latitude: 36.4000, longitude: 10.6167, address: 'Rue Habib Bourguiba, 8050 Hammamet',                   phone: '72.280.042', fax: '72.283.896' },

  // ── Bizerte ────────────────────────────────────────────────────────────────
  { id: 'bizerte',                name: 'Bizerte',                governorate: 'Bizerte',     latitude: 37.2746, longitude: 9.8739,  address: 'Rue des Martyrs, 7000 Bizerte',                        phone: '72.423.897', fax: '72.443.230' },
  { id: 'mateur',                 name: 'Mateur',                 governorate: 'Bizerte',     latitude: 37.0383, longitude: 9.6650,  address: 'Rue Habib Bourguiba, 7030 Mateur',                     phone: '72.465.015', fax: '72.465.271' },
  { id: 'menzel_bourguiba',       name: 'Menzel Bourguiba',       governorate: 'Bizerte',     latitude: 37.1547, longitude: 9.7881,  address: 'Place Rue des Martyrs, 7050 Menzel Bourguiba',         phone: '72.464.515', fax: '72.460.846' },
  { id: 'sejnane',                name: 'Sejnane',                governorate: 'Bizerte',     latitude: 37.0567, longitude: 9.2283,  address: 'Municipalité Sejnane, 7010 Sejnane',                   phone: '72.469.128', fax: '72.469.100' },
  { id: 'ras_jebel',              name: 'Ras Jebel',              governorate: 'Bizerte',     latitude: 37.2214, longitude: 10.1181, address: 'Rue des Martyrs, Ras Jebel 7070',                      phone: '72.447.024', fax: '72.447.170' },
  { id: 'el_alia',                name: 'El Alia',                governorate: 'Bizerte',     latitude: 37.1733, longitude: 10.0133, address: 'Rue Habib Bourguiba, 7016 El Alia',                    phone: '72.442.525', fax: '72.442.010' },
  { id: 'raf_raf',                name: 'Raf Raf',                governorate: 'Bizerte',     latitude: 37.1933, longitude: 10.1783, address: 'Rue des Martyrs, 7015 Raf Raf',                        phone: '72.441.622', fax: '72.441.610' },
  { id: 'metline',                name: 'Metline',                governorate: 'Bizerte',     latitude: 37.2317, longitude: 10.2200, address: 'Rue Farhat Hached, 7034 Metline',                      phone: '72.446.455', fax: '72.446.777' },
  { id: 'ghar_el_melh',           name: 'Ghar El Melh',           governorate: 'Bizerte',     latitude: 37.1783, longitude: 10.1817, address: 'Rue Habib Bourguiba 7033',                             phone: '72.448.712', fax: '72.448.712' },
  { id: 'aousja',                 name: 'Aousja',                 governorate: 'Bizerte',     latitude: 37.2467, longitude: 10.0633, address: 'Rue Habib Bourguiba, 7014 Aousja',                     phone: '72.402.701', fax: '72.402.577' },
  { id: 'menzel_jemil',           name: 'Menzel Jemil',           governorate: 'Bizerte',     latitude: 37.2183, longitude: 9.9533,  address: 'Rue Habib Bourguiba',                                  phone: '72.440.876', fax: '72.492.117' },
  { id: 'menzel_abderrahmane',    name: 'Menzel Abderrahmane',    governorate: 'Bizerte',     latitude: 37.2083, longitude: 9.9917,  address: 'Rue de l\'Environnement 7035',                         phone: '72.571.295', fax: '72.570.125' },
  { id: 'tinja',                  name: 'Tinja',                  governorate: 'Bizerte',     latitude: 37.1450, longitude: 9.9950,  address: 'Rue Habib Bourguiba, Tinja 7032',                      phone: '72.569.044', fax: '72.567.462' },

  // ── Zaghouan ───────────────────────────────────────────────────────────────
  { id: 'zaghouan',               name: 'Zaghouan',               governorate: 'Zaghouan',    latitude: 36.4028, longitude: 10.1436, address: 'Rue de l\'Indépendance, Zaghouan',                     phone: '72.675.866', fax: '72.675.699' },
  { id: 'el_fahs',                name: 'El Fahs',                governorate: 'Zaghouan',    latitude: 36.3767, longitude: 9.9050,  address: 'Rue Abou El Kacem Chebbi, El Fahs',                    phone: '72.670.006', fax: '72.670.116' },
  { id: 'zriba',                  name: 'Zriba',                  governorate: 'Zaghouan',    latitude: 36.3133, longitude: 10.2267, address: 'Zriba Hammam',                                         phone: '72.677.507', fax: '72.678.532' },
  { id: 'bir_mcherga',            name: 'Bir Mcherga',            governorate: 'Zaghouan',    latitude: 36.3650, longitude: 9.7267,  address: 'Rue Habib Bourguiba, Bir Mcherga',                     phone: '72.679.270', fax: '72.279.305' },
  { id: 'ennadhour',              name: 'Ennadhour',              governorate: 'Zaghouan',    latitude: 36.4500, longitude: 9.8667,  address: 'Rue Okba Ibn Nafaa, Ennadhour',                        phone: '72.678.811', fax: '72.678.532' },
  { id: 'jebel_oust',             name: 'Jebel Oust',             governorate: 'Zaghouan',    latitude: 36.4767, longitude: 10.0633, address: 'Rue du Maghreb Arabe, Jebel Oust',                     phone: '72.640.182', fax: '72.640.200' },

  // ── Sousse ─────────────────────────────────────────────────────────────────
  { id: 'sousse',                 name: 'Sousse',                 governorate: 'Sousse',      latitude: 35.8288, longitude: 10.6390, address: 'Rue Mohamed V, 4000 Sousse',                           phone: '73.211.225', fax: '73.924.228' },
  { id: 'hammam_sousse',          name: 'Hammam Sousse',          governorate: 'Sousse',      latitude: 35.8600, longitude: 10.5983, address: 'Rue de la République, Hammam Sousse 4011',             phone: '73.362.086', fax: '73.362.677' },
  { id: 'msaken',                 name: 'Msaken',                 governorate: 'Sousse',      latitude: 35.7297, longitude: 10.5756, address: 'Rue de la République, 4070 Msaken',                    phone: '73.259.016', fax: '73.259.116' },
  { id: 'kalaa_kebira',           name: 'Kalaa Kebira',           governorate: 'Sousse',      latitude: 35.8722, longitude: 10.5297, address: 'Rue des Martyrs, Kalaa Kebira 4060',                   phone: '73.253.016', fax: '73.253.046' },
  { id: 'kalaa_seghira',          name: 'Kalaa Seghira',          governorate: 'Sousse',      latitude: 35.8567, longitude: 10.5533, address: 'Rue Habib Bourguiba, 4021 Kalaa Seghira',              phone: '73.249.953', fax: '73.249.211' },
  { id: 'akouda',                 name: 'Akouda',                 governorate: 'Sousse',      latitude: 35.8681, longitude: 10.5781, address: '4022 El Aïmas, Akouda, Sousse',                        phone: '73.356.399', fax: '73.256.200' },
  { id: 'bouficha',               name: 'Bouficha',               governorate: 'Sousse',      latitude: 36.2033, longitude: 10.5250, address: 'Rue Hédi Chaker, Bouficha 4010',                       phone: '73.252.013', fax: '73.252.085' },
  { id: 'enfidha',                name: 'Enfidha',                governorate: 'Sousse',      latitude: 36.1383, longitude: 10.3767, address: 'Rue de la République 4030',                            phone: '73.250.020', fax: '73.250.355' },
  { id: 'sidi_bou_ali',           name: 'Sidi Bou Ali',           governorate: 'Sousse',      latitude: 36.0917, longitude: 10.4983, address: 'Rue Habib Bourguiba',                                  phone: '73.247.024', fax: '73.247.033' },
  { id: 'messaadine',             name: 'Messaadine',             governorate: 'Sousse',      latitude: 35.7967, longitude: 10.5317, address: 'Rue des Martyrs',                                      phone: '73.285.388', fax: '73.284.460' },
  { id: 'zaouiet_sousse',         name: 'Zaouiet Sousse',         governorate: 'Sousse',      latitude: 35.7983, longitude: 10.6100, address: 'Rue des Martyrs',                                      phone: '73.231.719', fax: '73.230.719' },
  { id: 'hergla',                 name: 'Hergla',                 governorate: 'Sousse',      latitude: 36.0567, longitude: 10.5267, address: 'Rue Habib Bourguiba, 4012 Hergla',                     phone: '73.251.014', fax: '73.251.254' },
  { id: 'ezzouhour',              name: 'Ezzouhour',              governorate: 'Sousse',      latitude: 35.7983, longitude: 10.6417, address: 'Rue 9 Avril, 4031 Ezzouhour',                          phone: '73.310.864', fax: '73.310.864' },
  { id: 'ksibet_sousse',          name: 'Ksibet Sousse',          governorate: 'Sousse',      latitude: 35.7783, longitude: 10.6183, address: 'Rue de l\'Environnement, Ksibet Sousse 4041',          phone: '73.238.402', fax: '73.238.402' },
  { id: 'sidi_el_hani',           name: 'Sidi El Hani',           governorate: 'Sousse',      latitude: 35.8133, longitude: 10.3583, address: 'Rue de l\'Environnement, Sidi El Hani',                phone: '73.280.123', fax: '73.280.123' },
  { id: 'kondar',                 name: 'Kondar',                 governorate: 'Sousse',      latitude: 35.7650, longitude: 10.4400, address: 'Rue Er-Rawda',                                         phone: '73.389.950', fax: '73.389.693' },

  // ── Monastir ───────────────────────────────────────────────────────────────
  { id: 'monastir',               name: 'Monastir',               governorate: 'Monastir',    latitude: 35.7643, longitude: 10.8113, address: 'Rue Habib Bourguiba 5000',                             phone: '73.461.270', fax: '73.462.430' },
  { id: 'bekalta',                name: 'Bekalta',                governorate: 'Monastir',    latitude: 35.6167, longitude: 10.7033, address: 'Place Rue des Martyrs, 5090 Bekalta',                  phone: '73.477.018', fax: '73.477.102' },
  { id: 'bouhjar',                name: 'Bouhjar',                governorate: 'Monastir',    latitude: 35.6183, longitude: 10.7467, address: 'Rue Mohamed Karim, 5015 Bouhjar',                      phone: '73.434.191', fax: '73.434.139' },
  { id: 'lamta',                  name: 'Lamta',                  governorate: 'Monastir',    latitude: 35.7117, longitude: 10.9567, address: 'Rue Habib Bourguiba, 5099 Lamta',                      phone: '73.555.103', fax: '73.555.103' },
  { id: 'moknine',                name: 'Moknine',                governorate: 'Monastir',    latitude: 35.6383, longitude: 10.9133, address: 'Rue Habib Bourguiba, Moknine 5050',                    phone: '73.475.012', fax: '73.475.084' },
  { id: 'ksar_hellal',            name: 'Ksar Hellal',            governorate: 'Monastir',    latitude: 35.6481, longitude: 10.8922, address: 'Rue Habib Bourguiba 5070',                             phone: '73.475.283', fax: '73.476.006' },
  { id: 'menzel_hayet',           name: 'Menzel Hayet',           governorate: 'Monastir',    latitude: 35.5917, longitude: 10.9167, address: 'Rue de l\'Environnement, 5033 Menzel Hayet',           phone: '73.410.126', fax: '73.410.120' },
  { id: 'sahline',                name: 'Sahline',                governorate: 'Monastir',    latitude: 35.7733, longitude: 10.7600, address: '71 Rue Taïeb Méhiri, 5012',                            phone: '73.526.154', fax: '73.526.154' },
  { id: 'jemmal',                 name: 'Jemmal',                 governorate: 'Monastir',    latitude: 35.6206, longitude: 10.7614, address: 'Rue El Kassas, Jemmal 5020',                           phone: '73.486.827', fax: '73.486.827' },
  { id: 'bembla',                 name: 'Bembla',                 governorate: 'Monastir',    latitude: 35.7450, longitude: 10.9000, address: 'Rue 14 Janvier, Bembla 5021',                          phone: '73.478.308', fax: '73.478.720' },
  { id: 'bnen_bodher',            name: 'Bnen Bodher',            governorate: 'Monastir',    latitude: 35.7317, longitude: 10.9800, address: 'Rue des Martyrs 5025',                                 phone: '73.558.396', fax: '73.558.099' },
  { id: 'menzel_kamel',           name: 'Menzel Kamel',           governorate: 'Monastir',    latitude: 35.5733, longitude: 10.9650, address: 'Rue Habib Bourguiba, Menzel Kamel 5013',               phone: '73.480.023', fax: '73.574.027' },
  { id: 'menzel_ennour',          name: 'Menzel Ennour',          governorate: 'Monastir',    latitude: 35.5683, longitude: 10.9883, address: 'Rue Habib Bourguiba, Menzel Ennour 5022',              phone: '73.412.363', fax: '73.412.851' },
  { id: 'menzel_fersi',           name: 'Menzel Fersi',           governorate: 'Monastir',    latitude: 35.5450, longitude: 11.0000, address: 'Rue de l\'Environnement, Menzel Fersi',                phone: '73.400.087', fax: '73.400.400' },
  { id: 'khniss',                 name: 'Khniss',                 governorate: 'Monastir',    latitude: 35.7200, longitude: 10.8500, address: 'Rue Habib Bourguiba, Khniss 5011',                     phone: '73.535.801', fax: '73.535.801' },
  { id: 'achraihil',              name: 'Achraïhil',              governorate: 'Monastir',    latitude: 35.7300, longitude: 10.8600, address: 'Rue de l\'Environnement, Achraïhil 5034',              phone: '73.404.187', fax: '73.404.187' },
  { id: 'amiret_el_hajjaj',       name: 'Amiret El Hajjaj',       governorate: 'Monastir',    latitude: 35.8200, longitude: 10.7050, address: 'Rue de l\'Environnement, Amiret El Hajjaj 5071',       phone: '73.694.811', fax: '73.694.811' },
  { id: 'amiret_touazra',         name: 'Amiret Touazra',         governorate: 'Monastir',    latitude: 35.7900, longitude: 10.7300, address: 'Place Rue des Martyrs 5054',                           phone: '73.407.107', fax: '73.407.107' },
  { id: 'sidi_bennour',           name: 'Sidi Bennour',           governorate: 'Monastir',    latitude: 35.7600, longitude: 10.7700, address: 'Rue 9 Avril, Sidi Bennour 5044',                       phone: '73.406.105', fax: '73.406.105' },
  { id: 'amiret_fhoul',           name: 'Amiret El Fhoul',        governorate: 'Monastir',    latitude: 35.8100, longitude: 10.6900, address: 'Amiret El Fhoul 5053',                                 phone: '73.694.316', fax: '73.694.316' },
  { id: 'teboulba',               name: 'Teboulba',               governorate: 'Monastir',    latitude: 35.6983, longitude: 10.9883, address: 'Rue Habib Bourguiba',                                  phone: '73.479.009', fax: '73.492.680' },
  { id: 'ouerdanine',             name: 'Ouerdanine',             governorate: 'Monastir',    latitude: 35.6583, longitude: 10.7017, address: 'Rue Habib Bourguiba 5010',                             phone: '73.519.016', fax: '73.518.203' },
  { id: 'sidi_ameur',             name: 'Sidi Ameur',             governorate: 'Monastir',    latitude: 35.6800, longitude: 10.7500, address: 'Rue Habib Bourguiba, 5061 Sidi Ameur',                 phone: '73.527.532', fax: '73.527.500' },
  { id: 'el_massoura',            name: 'El Massoura',            governorate: 'Monastir',    latitude: 35.6900, longitude: 10.7350, address: 'Place Rue des Martyrs, El Massoura',                   phone: '73.414.307', fax: '73.414.307' },
  { id: 'zeramdine',              name: 'Zeramdine',              governorate: 'Monastir',    latitude: 35.7000, longitude: 10.7333, address: 'Rue Habib Bourguiba',                                  phone: '73.498.546', fax: '73.498.041' },
  { id: 'el_ghanada',             name: 'El Ghanada',             governorate: 'Monastir',    latitude: 35.6300, longitude: 10.8800, address: 'Rue de l\'Environnement 5026',                         phone: '73.456.143', fax: '73.456.143' },
  { id: 'zaouia_kontach',         name: 'Zaouia Kontach',         governorate: 'Monastir',    latitude: 35.6400, longitude: 10.8500, address: 'Rue Habib Bourguiba',                                  phone: '73.486.596', fax: '73.484.551' },
  { id: 'sayada',                 name: 'Sayada',                 governorate: 'Monastir',    latitude: 35.6483, longitude: 10.7383, address: 'Rue Habib Bourguiba, Sayada 5053',                     phone: '73.430.093', fax: '73.430.439' },
  { id: 'touza',                  name: 'Touza',                  governorate: 'Monastir',    latitude: 35.6950, longitude: 10.7150, address: 'Rue Habib Bourguiba 5023',                             phone: '73.489.996', fax: '73.489.996' },
  { id: 'ksibet_el_mediouni',     name: 'Ksibet El Mediouni',     governorate: 'Monastir',    latitude: 35.6900, longitude: 10.8300, address: 'Rue Habib Bourguiba 5031',                             phone: '73.469.006', fax: '73.469.006' },
  { id: 'beni_hassen',            name: 'Beni Hassen',            governorate: 'Monastir',    latitude: 35.7333, longitude: 10.9200, address: 'Rue Habib Bourguiba, 5014 Beni Hassen',                phone: '73.490.508', fax: '73.490.007' },

  // ── Mahdia ─────────────────────────────────────────────────────────────────
  { id: 'mahdia',                 name: 'Mahdia',                 governorate: 'Mahdia',      latitude: 35.5047, longitude: 11.0622, address: 'Place des Martyrs, 5100 Mahdia',                       phone: '73.681.700', fax: '73.695.330' },
  { id: 'rejiche',                name: 'Rejiche',                governorate: 'Mahdia',      latitude: 35.4367, longitude: 11.0183, address: 'Rue Habib Thameur',                                    phone: '73.640.435', fax: '73.640.435' },
  { id: 'ksour_essef',            name: 'Ksour Essef',            governorate: 'Mahdia',      latitude: 35.0833, longitude: 11.0167, address: 'Rue Ali Ben Kamla',                                    phone: '73.665.029', fax: '73.665.326' },
  { id: 'el_bradaa',              name: 'El Bradâa',              governorate: 'Mahdia',      latitude: 35.3167, longitude: 11.0667, address: 'Place Rue des Martyrs',                                phone: '73.650.008', fax: '73.650.008' },
  { id: 'sidi_alouane',           name: 'Sidi Alouane',           governorate: 'Mahdia',      latitude: 35.2967, longitude: 10.9483, address: 'Rue Ibn Zaïdoun',                                      phone: '73.659.041', fax: '73.658.230' },
  { id: 'el_jem',                 name: 'El Jem',                 governorate: 'Mahdia',      latitude: 35.2975, longitude: 10.7122, address: 'Place de l\'Indépendance',                             phone: '73.630.600', fax: '73.630.917' },
  { id: 'boumerdes',              name: 'Boumerdes',              governorate: 'Mahdia',      latitude: 35.3883, longitude: 10.8200, address: 'Rue Farhat Hached',                                    phone: '73.620.393', fax: '73.620.392' },
  { id: 'kerker',                 name: 'Kerker',                 governorate: 'Mahdia',      latitude: 35.3733, longitude: 10.8783, address: 'Route Nationale N°1',                                  phone: '73.629.260', fax: '73.629.040' },
  { id: 'chebba',                 name: 'Chebba',                 governorate: 'Mahdia',      latitude: 35.2381, longitude: 11.1147, address: 'Rue Hédi Chaker',                                      phone: '73.643.866', fax: '73.643.336' },
  { id: 'melloulche',             name: 'Melloulèche',            governorate: 'Mahdia',      latitude: 35.2683, longitude: 11.0533, address: 'Rue de l\'Environnement',                              phone: '73.649.680', fax: '73.649.680' },
  { id: 'souassi',                name: 'Souassi',                governorate: 'Mahdia',      latitude: 35.2350, longitude: 10.9383, address: 'Rue de la République',                                 phone: '73.610.211', fax: '73.610.499' },
  { id: 'chorbane',               name: 'Chorbane',               governorate: 'Mahdia',      latitude: 35.1817, longitude: 10.7783, address: 'Rue Habib Bourguiba',                                  phone: '73.600.188', fax: '73.600.366' },
  { id: 'hebira',                 name: 'Hebira',                 governorate: 'Mahdia',      latitude: 35.1500, longitude: 10.8667, address: 'Rue Ibn Khaldoun',                                     phone: '73.609.005', fax: '73.609.005' },
  { id: 'ouled_chamekh',          name: 'Ouled Chamekh',          governorate: 'Mahdia',      latitude: 35.1583, longitude: 10.9267, address: 'Rue des Martyrs',                                      phone: '73.619.037', fax: '73.619.037' },

  // ── Sfax ───────────────────────────────────────────────────────────────────
  { id: 'sfax',                   name: 'Sfax',                   governorate: 'Sfax',        latitude: 34.7400, longitude: 10.7600, address: 'Rue Habib Bourguiba, BP 3023',                         phone: '74.229.744', fax: '74.297.344' },
  { id: 'menzel_chaker',          name: 'Menzel Chaker',          governorate: 'Sfax',        latitude: 34.9833, longitude: 10.4333, address: 'Rue Bourguiba',                                        phone: '74.285.485', fax: '74.285.440' },
  { id: 'ech_chihya',             name: 'Ech-Chihya',             governorate: 'Sfax',        latitude: 34.8200, longitude: 10.6900, address: 'Rue Habib Bourguiba, Route Tniyour Km 6',              phone: '74.254.689', fax: '74.250.503' },
  { id: 'kerkennah',              name: 'Kerkennah',              governorate: 'Sfax',        latitude: 34.7000, longitude: 11.1167, address: 'Rue Farhat Hached, Remla Kerkennah 3070',              phone: '74.481.013', fax: '74.481.107' },
  { id: 'ghraiba',                name: 'Ghraïba',                governorate: 'Sfax',        latitude: 34.8650, longitude: 10.4650, address: 'Rue de l\'Environnement 3034',                         phone: '74.283.785', fax: '74.283.785' },
  { id: 'sakiet_ezzit',           name: 'Sakiet Ezzit',           governorate: 'Sfax',        latitude: 34.7894, longitude: 10.7481, address: 'Route de Tunis Km 6, Place Mufida Bourguiba 3021',     phone: '74.251.850', fax: '74.256.082' },
  { id: 'hencha',                 name: 'Hencha',                 governorate: 'Sfax',        latitude: 34.6483, longitude: 10.3167, address: 'Rue Farhat Hached, 3010 Hencha',                       phone: '74.284.014', fax: '74.284.022' },
  { id: 'skhira',                 name: 'Skhira',                 governorate: 'Sfax',        latitude: 34.3033, longitude: 10.0683, address: 'Rue Béchir El Mouhaddib, 3050 Skhira',                 phone: '74.295.423', fax: '74.295.360' },
  { id: 'jebiniana',              name: 'Jebiniana',              governorate: 'Sfax',        latitude: 34.6067, longitude: 10.4017, address: 'Rue Habib Bourguiba 3080',                             phone: '74.880.033', fax: '74.880.126' },
  { id: 'el_ain',                 name: 'El Ain',                 governorate: 'Sfax',        latitude: 34.8167, longitude: 10.5583, address: 'Route El Ain Km 5',                                    phone: '74.651.190', fax: '74.651.200' },
  { id: 'bir_ali_ben_khalifa',    name: 'Bir Ali Ben Khalifa',    governorate: 'Sfax',        latitude: 34.7217, longitude: 10.0950, address: 'Rue 2 Mars, Bir Ali Ben Khalifa',                      phone: '74.277.021', fax: '74.277.311' },
  { id: 'agareb',                 name: 'Agareb',                 governorate: 'Sfax',        latitude: 34.7433, longitude: 10.5417, address: 'Rue Hédi Chaker',                                      phone: '74.271.240', fax: '74.271.344' },
  { id: 'mahres',                 name: 'Mahres',                 governorate: 'Sfax',        latitude: 34.5333, longitude: 10.4983, address: 'Quartier Administratif, 3060 Mahres',                  phone: '74.290.049', fax: '74.290.283' },
  { id: 'sakiet_eddaier',         name: 'Sakiet Eddaier',         governorate: 'Sfax',        latitude: 34.7714, longitude: 10.7831, address: 'Route de Mahdia Km 7, Sakiet Eddaier 3011',            phone: '74.294.931', fax: '74.294.237' },
  { id: 'thyna',                  name: 'Thyna',                  governorate: 'Sfax',        latitude: 34.7117, longitude: 10.7917, address: 'Route Gabès Km 7.5, Thyna Sfax 3083',                 phone: '74.289.170', fax: '74.289.171' },
  { id: 'gremda',                 name: 'Gremda',                 governorate: 'Sfax',        latitude: 34.7317, longitude: 10.8317, address: 'Route de Gremda Km 6, 3022 Sfax',                     phone: '74.268.448', fax: '74.268.580' },

  // ── Béja ───────────────────────────────────────────────────────────────────
  { id: 'beja',                   name: 'Béja',                   governorate: 'Béja',        latitude: 36.7256, longitude: 9.1817,  address: 'Place de l\'Indépendance, 9000',                       phone: '78.451.944', fax: '78.457.603' },
  { id: 'medjez_el_bab',          name: 'Medjez El Bab',          governorate: 'Béja',        latitude: 36.6553, longitude: 9.6106,  address: 'Rue Farhat Hached, 9070',                              phone: '78.560.053', fax: '78.560.824' },
  { id: 'teboursouk',             name: 'Téboursouk',             governorate: 'Béja',        latitude: 36.4583, longitude: 9.2483,  address: 'Place Rue des Martyrs, 9040',                          phone: '78.465.640', fax: '78.465.050' },
  { id: 'testour',                name: 'Testour',                governorate: 'Béja',        latitude: 36.5500, longitude: 9.4583,  address: 'Rue des Martyrs, 9060',                                phone: '78.570.022', fax: '78.570.061' },
  { id: 'nefza',                  name: 'Nefza',                  governorate: 'Béja',        latitude: 37.0250, longitude: 9.0333,  address: 'Rue Habib Bourguiba, 9010',                            phone: '78.471.133', fax: '78.471.295' },
  { id: 'zahret_mediene',         name: 'Zahret Mediène',         governorate: 'Béja',        latitude: 36.7567, longitude: 9.3933,  address: 'Rue Habib Bourguiba, 9030',                            phone: '78.469.061', fax: '78.469.061' },
  { id: 'maagoula',               name: 'Maagoula',               governorate: 'Béja',        latitude: 36.6750, longitude: 9.3933,  address: 'Rue des Martyrs, 9023',                                phone: '78.400.090', fax: '78.400.090' },
  { id: 'goubellat',              name: 'Goubellat',              governorate: 'Béja',        latitude: 36.5650, longitude: 9.7867,  address: 'Rue de la République, 9080',                           phone: '78.585.175', fax: '78.585.175' },

  // ── Jendouba ───────────────────────────────────────────────────────────────
  { id: 'jendouba',               name: 'Jendouba',               governorate: 'Jendouba',    latitude: 36.5012, longitude: 8.7803,  address: '26 Rue Taïeb Méhiri, 8100 Jendouba',                  phone: '78.600.482', fax: '78.600.705' },
  { id: 'bousalem',               name: 'Bousalem',               governorate: 'Jendouba',    latitude: 36.6333, longitude: 8.9750,  address: 'Place Farhat Hached, 8170',                            phone: '78.638.300', fax: '78.638.513' },
  { id: 'tabarka',                name: 'Tabarka',                governorate: 'Jendouba',    latitude: 36.9544, longitude: 8.7567,  address: 'Rue Habib Bourguiba, 8110 Tabarka',                    phone: '78.673.213', fax: '78.673.253' },
  { id: 'ghardimaou',             name: 'Ghardimaou',             governorate: 'Jendouba',    latitude: 36.4500, longitude: 8.4333,  address: 'Rue Habib Bourguiba, 8160 Ghardimaou',                 phone: '78.660.054', fax: '78.660.311' },
  { id: 'ain_draham',             name: 'Aïn Draham',             governorate: 'Jendouba',    latitude: 36.7800, longitude: 8.6900,  address: 'Rue Habib Bourguiba, 8130 Aïn Draham',                 phone: '78.655.309', fax: '78.655.198' },
  { id: 'fernana',                name: 'Fernana',                governorate: 'Jendouba',    latitude: 36.6300, longitude: 8.7167,  address: 'Rue 2 Mars, 8140 Fernana',                             phone: '78.641.015', fax: '78.641.500' },
  { id: 'oued_meliz',             name: 'Oued Meliz',             governorate: 'Jendouba',    latitude: 36.4833, longitude: 8.5667,  address: 'Rue Abdelhamid Marzougui, 8115 Oued Meliz',            phone: '78.690.138', fax: '78.690.032' },
  { id: 'beni_mtir',              name: 'Beni Mtir',              governorate: 'Jendouba',    latitude: 36.7167, longitude: 8.7500,  address: 'Rue 9 Avril, 8114 Beni Mtir',                          phone: '78.649.064', fax: '78.649.012' },

  // ── Le Kef ─────────────────────────────────────────────────────────────────
  { id: 'le_kef',                 name: 'Le Kef',                 governorate: 'Le Kef',      latitude: 36.1822, longitude: 8.7147,  address: 'Rue 8 Juillet 1884, 7100',                             phone: '78.201.122', fax: '78.200.647' },
  { id: 'le_sers',                name: 'Le Sers',                governorate: 'Le Kef',      latitude: 35.9167, longitude: 9.0500,  address: 'Place Rue des Martyrs, Le Sers 7180',                  phone: '78.262.266', fax: '78.262.086' },
  { id: 'nebeur',                 name: 'Nebeur',                 governorate: 'Le Kef',      latitude: 36.2767, longitude: 8.8067,  address: 'Rue Saliha, 7110',                                     phone: '78.246.092', fax: '78.246.315' },
  { id: 'touiref',                name: 'Touiref',                governorate: 'Le Kef',      latitude: 36.3833, longitude: 8.6833,  address: 'Rue de l\'Environnement, 7112',                        phone: '78.240.074', fax: '78.240.027' },
  { id: 'sakiet_sidi_youssef',    name: 'Sakiet Sidi Youssef',    governorate: 'Le Kef',      latitude: 36.2317, longitude: 8.3433,  address: 'Rue de l\'Algérie, 7120',                              phone: '78.258.720', fax: '78.258.311' },
  { id: 'kalaat_senan',           name: 'Kalaat Senan',           governorate: 'Le Kef',      latitude: 36.2050, longitude: 8.4967,  address: 'Rue Habib Bourguiba, 7130 Kalaat Senan',               phone: '78.296.105', fax: '78.296.251' },
  { id: 'kalaat_khasba',          name: 'Kalaat Khasba',          governorate: 'Le Kef',      latitude: 35.9700, longitude: 8.6533,  address: 'Rue Farhat Hached, 7113',                              phone: '78.243.125', fax: '78.243.125' },
  { id: 'menzel_salem',           name: 'Menzel Salem',           governorate: 'Le Kef',      latitude: 36.3483, longitude: 8.9567,  address: 'Rue Habib Bourguiba, 7151',                            phone: '78.300.260', fax: '78.300.119' },
  { id: 'tajerouine',             name: 'Tajerouine',             governorate: 'Le Kef',      latitude: 35.8917, longitude: 8.5417,  address: 'Place de la République, 7150 Tajerouine',              phone: '78.227.036', fax: '78.227.036' },
  { id: 'jerissa',                name: 'Jerissa',                governorate: 'Le Kef',      latitude: 35.8667, longitude: 8.6333,  address: 'Rue de l\'Environnement, 7114',                        phone: '78.253.045', fax: '78.253.045' },
  { id: 'dahmani',                name: 'Dahmani',                governorate: 'Le Kef',      latitude: 35.9483, longitude: 8.8683,  address: 'Rue Habib Bourguiba, 7170',                            phone: '78.280.226', fax: '78.280.373' },
  { id: 'ksour',                  name: 'Ksour',                  governorate: 'Le Kef',      latitude: 35.7617, longitude: 8.7750,  address: 'Rue Habib Bourguiba, 7160',                            phone: '78.295.263', fax: '78.294.260' },

  // ── Siliana ────────────────────────────────────────────────────────────────
  { id: 'siliana',                name: 'Siliana',                governorate: 'Siliana',     latitude: 36.0847, longitude: 9.3706,  address: 'Rue Habib Bourguiba, Siliana 6100',                    phone: '78.871.045', fax: '78.871.852' },
  { id: 'makthar',                name: 'Makthar',                governorate: 'Siliana',     latitude: 35.8583, longitude: 9.2017,  address: 'Rue Farhat, Makthar 6140',                             phone: '78.826.522', fax: '78.826.153' },
  { id: 'bou_arada',              name: 'Bou Arada',              governorate: 'Siliana',     latitude: 36.3617, longitude: 9.6067,  address: 'Rue Mohamed Ali Hami, Bou Arada 6180',                 phone: '78.805.115', fax: '78.805.215' },
  { id: 'le_krib',                name: 'Le Krib',                governorate: 'Siliana',     latitude: 36.2217, longitude: 9.5467,  address: 'Rue Habib Bourguiba, Le Krib 6120',                    phone: '78.891.051', fax: '78.891.381' },
  { id: 'rouhia',                 name: 'Rouhia',                 governorate: 'Siliana',     latitude: 36.0517, longitude: 9.0667,  address: 'Rue Habib Bourguiba, Rouhia 6150',                     phone: '78.893.087', fax: '78.893.478' },
  { id: 'gaafour',                name: 'Gaafour',                governorate: 'Siliana',     latitude: 36.3200, longitude: 9.3283,  address: 'Rue Habib Bourguiba, 6110',                            phone: '78.817.047', fax: '78.817.346' },
  { id: 'bargou',                 name: 'Bargou',                 governorate: 'Siliana',     latitude: 36.0600, longitude: 9.5267,  address: 'Place des Martyrs, Bargou 6170',                       phone: '78.896.021', fax: '78.896.045' },
  { id: 'kesra',                  name: 'Kesra',                  governorate: 'Siliana',     latitude: 35.8167, longitude: 9.3667,  address: 'Rue des Martyrs, Kesra 6114',                          phone: '78.892.630', fax: '78.892.630' },
  { id: 'sidi_bourouis',          name: 'Sidi Bourouis',          governorate: 'Siliana',     latitude: 36.1667, longitude: 9.7167,  address: 'Rue de l\'Environnement, Sidi Bourouis 6113',          phone: '78.898.408', fax: '78.898.832' },
  { id: 'el_aroussa',             name: 'El Aroussa',             governorate: 'Siliana',     latitude: 36.2167, longitude: 9.6500,  address: 'Rue 9 Avril, El Aroussa 6116',                         phone: '78.890.224', fax: '78.890.224' },

  // ── Kairouan ───────────────────────────────────────────────────────────────
  { id: 'kairouan',               name: 'Kairouan',               governorate: 'Kairouan',    latitude: 35.6781, longitude: 10.0963, address: 'Rue de la République, 3100',                           phone: '77.230.044', fax: '77.234.532' },
  { id: 'sbikha',                 name: 'Sbikha',                 governorate: 'Kairouan',    latitude: 35.9083, longitude: 10.0000, address: 'Rue 18 Janvier 1952, 3100',                            phone: '77.365.031', fax: '77.365.517' },
  { id: 'oueslatia',              name: 'Oueslatia',              governorate: 'Kairouan',    latitude: 35.8867, longitude: 9.6017,  address: 'Rue Habib Bourguiba, 3120',                            phone: '77.350.011', fax: '77.350.211' },
  { id: 'chebika',                name: 'Chebika',                governorate: 'Kairouan',    latitude: 35.5983, longitude: 9.7183,  address: 'Rue de l\'Environnement, 3121',                        phone: '77.240.358', fax: '77.240.105' },
  { id: 'haffouz',                name: 'Haffouz',                governorate: 'Kairouan',    latitude: 35.6317, longitude: 9.6733,  address: 'Place de l\'Indépendance, 3130',                       phone: '77.355.011', fax: '77.355.004' },
  { id: 'el_alaa',                name: 'El Alâa',                governorate: 'Kairouan',    latitude: 35.5250, longitude: 9.9433,  address: 'Rue des Martyrs, 3150',                                phone: '77.256.028', fax: '77.256.220' },
  { id: 'hajeb_el_ayoun',         name: 'Hajeb El Ayoun',         governorate: 'Kairouan',    latitude: 35.3797, longitude: 9.5381,  address: 'Place Ali El Zouaoui, 3160',                           phone: '77.370.016', fax: '77.370.081' },
  { id: 'nasrallah',              name: 'Nasrallah',              governorate: 'Kairouan',    latitude: 35.3667, longitude: 9.9833,  address: '15 Rue Taïeb Méhiri, 3170',                            phone: '77.360.060', fax: '77.360.142' },
  { id: 'bouhajla',               name: 'Bouhajla',               governorate: 'Kairouan',    latitude: 35.7367, longitude: 9.8167,  address: 'Rue de l\'Environnement, 3180',                        phone: '77.266.012', fax: '77.266.108' },
  { id: 'cherarda',               name: 'Cherarda',               governorate: 'Kairouan',    latitude: 35.8500, longitude: 9.8667,  address: 'Rue des Martyrs, 3116',                                phone: '77.268.575', fax: '77.268.630' },

  // ── Sidi Bouzid ────────────────────────────────────────────────────────────
  { id: 'sidi_bouzid',            name: 'Sidi Bouzid',            governorate: 'Sidi Bouzid', latitude: 35.0381, longitude: 9.4848,  address: 'Rue Habib Bourguiba',                                  phone: '76.632.048', fax: '76.632.064' },
  { id: 'regueb',                 name: 'Regueb',                 governorate: 'Sidi Bouzid', latitude: 34.9633, longitude: 9.7867,  address: 'Rue de la République',                                 phone: '76.640.029', fax: '76.640.091' },
  { id: 'sidi_ali_ben_aoun',      name: 'Sidi Ali Ben Aoun',      governorate: 'Sidi Bouzid', latitude: 35.1967, longitude: 9.2150,  address: 'Rue Farhat Hached',                                    phone: '76.660.055', fax: '76.660.314' },
  { id: 'jelma',                  name: 'Jelma',                  governorate: 'Sidi Bouzid', latitude: 35.2833, longitude: 9.5333,  address: 'Rue des Martyrs',                                      phone: '76.657.316', fax: '76.657.023' },
  { id: 'mezzouna',               name: 'Mezzouna',               governorate: 'Sidi Bouzid', latitude: 34.5833, longitude: 9.7333,  address: 'Rue des Martyrs',                                      phone: '76.668.333', fax: '76.668.550' },
  { id: 'meknassy',               name: 'Meknassy',               governorate: 'Sidi Bouzid', latitude: 34.9750, longitude: 9.9833,  address: 'Rue Habib Bourguiba',                                  phone: '76.646.010', fax: '76.645.233' },
  { id: 'sebala',                 name: 'Sebala',                 governorate: 'Sidi Bouzid', latitude: 35.0833, longitude: 9.3000,  address: 'Rue des Martyrs',                                      phone: '76.674.018', fax: '76.674.222' },
  { id: 'bir_el_hafey',           name: 'Bir El Hafey',           governorate: 'Sidi Bouzid', latitude: 34.7167, longitude: 9.1833,  address: 'Rue Farhat Hached',                                    phone: '76.677.414', fax: '76.677.006' },
  { id: 'menzel_bouzaiane',       name: 'Menzel Bouzaiane',       governorate: 'Sidi Bouzid', latitude: 34.8817, longitude: 9.4100,  address: 'Rue des Martyrs',                                      phone: '76.672.166', fax: '76.672.360' },
  { id: 'ouled_haffouz',          name: 'Ouled Haffouz',          governorate: 'Sidi Bouzid', latitude: 35.1167, longitude: 9.6333,  address: 'Rue Habib Bourguiba',                                  phone: '76.678.208', fax: '76.678.060' },

  // ── Kasserine ──────────────────────────────────────────────────────────────
  { id: 'kasserine',              name: 'Kasserine',              governorate: 'Kasserine',   latitude: 35.1676, longitude: 8.8306,  address: 'Place des Martyrs, Kasserine 1200',                    phone: '77.474.026', fax: '77.474.553' },
  { id: 'sbeitla',                name: 'Sbeitla',                governorate: 'Kasserine',   latitude: 35.2383, longitude: 9.1200,  address: 'Rue Taïeb Méhiri, Sbeitla 1250',                      phone: '77.465.324', fax: '77.465.712' },
  { id: 'feriana',                name: 'Fériana',                governorate: 'Kasserine',   latitude: 34.9500, longitude: 8.5667,  address: 'Rue Habib Bourguiba, Fériana 1240',                    phone: '77.441.322', fax: '77.441.349' },
  { id: 'foussana',               name: 'Foussana',               governorate: 'Kasserine',   latitude: 35.2167, longitude: 8.7000,  address: 'Rue des Martyrs, Foussana 1220',                       phone: '77.420.662', fax: '77.420.544' },
  { id: 'sbiba',                  name: 'Sbiba',                  governorate: 'Kasserine',   latitude: 35.5000, longitude: 9.0667,  address: 'Rue des Martyrs, Sbiba 1270',                          phone: '77.488.003', fax: '77.488.380' },
  { id: 'thala',                  name: 'Thala',                  governorate: 'Kasserine',   latitude: 35.5667, longitude: 8.6667,  address: 'Rue Habib Bourguiba, Thala 1210',                      phone: '77.480.422', fax: '77.480.304' },
  { id: 'haidra',                 name: 'Haïdra',                 governorate: 'Kasserine',   latitude: 35.5667, longitude: 8.4167,  address: 'Rue des Martyrs, Haïdra 1221',                         phone: '77.486.040', fax: '77.486.040' },
  { id: 'telabet',                name: 'Telabet',                governorate: 'Kasserine',   latitude: 35.2833, longitude: 8.9667,  address: 'Rue des Martyrs, Telabet 1215',                        phone: '77.431.106', fax: '77.431.333' },
  { id: 'jedelienne',             name: 'Jedelienne',             governorate: 'Kasserine',   latitude: 35.3500, longitude: 9.1000,  address: 'Rue des Martyrs, Jedelienne',                          phone: '77.425.217', fax: '77.425.217' },
  { id: 'majel_bel_abbes',        name: 'Majel Bel Abbès',        governorate: 'Kasserine',   latitude: 35.0333, longitude: 9.1833,  address: 'Rue 14 Janvier, Majel Bel Abbès 1214',                 phone: '77.445.110', fax: '77.445.110' },

  // ── Gabès ──────────────────────────────────────────────────────────────────
  { id: 'gabes',                  name: 'Gabès',                  governorate: 'Gabès',       latitude: 33.8881, longitude: 10.0975, address: 'Rue Boubabba El Marabout, 6019 Gabès',                 phone: '75.270.109', fax: '75.275.268' },
  { id: 'el_hamma',               name: 'El Hamma',               governorate: 'Gabès',       latitude: 33.8833, longitude: 9.7983,  address: 'Rue de l\'Environnement, 6020 El Hamma',               phone: '75.331.009', fax: '75.331.920' },
  { id: 'mareth',                 name: 'Mareth',                 governorate: 'Gabès',       latitude: 33.6683, longitude: 10.2950, address: 'Rue Habib Bourguiba, 6080 Mareth',                     phone: '75.321.166', fax: '75.321.157' },
  { id: 'ghannouch',              name: 'Ghannouch',              governorate: 'Gabès',       latitude: 33.9333, longitude: 10.0000, address: 'Rue Habib Bourguiba, 6025 Ghannouch',                  phone: '75.225.344', fax: '75.225.040' },
  { id: 'chenini_nahal',          name: 'Chenini Nahal',          governorate: 'Gabès',       latitude: 33.9000, longitude: 10.1500, address: 'Rue Halima El Saadia, 6041 Chenini Nahal',             phone: '75.227.418', fax: '75.227.750' },
  { id: 'metouia',                name: 'Metouia',                governorate: 'Gabès',       latitude: 33.9667, longitude: 10.0000, address: 'Rue Habib Bourguiba',                                  phone: '75.370.506', fax: '75.370.860' },
  { id: 'oudhref',                name: 'Oudhref',                governorate: 'Gabès',       latitude: 33.5167, longitude: 10.1000, address: 'Rue Farhat Hached, 6025 Oudhref',                      phone: '75.365.011', fax: '75.366.250' },
  { id: 'zarat',                  name: 'Zarat',                  governorate: 'Gabès',       latitude: 33.5000, longitude: 10.1667, address: 'Rue des Martyrs, 6026 Zarat',                          phone: '75.530.374', fax: '75.300.277' },
  { id: 'nouvelle_matmata',       name: 'Nouvelle Matmata',       governorate: 'Gabès',       latitude: 33.5383, longitude: 9.9733,  address: 'Rue Habib Bourguiba, 6044 Nouvelle Matmata',           phone: '75.230.529', fax: '75.230.917' },
  { id: 'matmata',                name: 'Matmata',                governorate: 'Gabès',       latitude: 33.5417, longitude: 9.9717,  address: 'Rue Habib Bourguiba, 6070 Matmata',                    phone: '75.240.076', fax: '75.240.076' },

  // ── Médenine ───────────────────────────────────────────────────────────────
  { id: 'medenine',               name: 'Médenine',               governorate: 'Médenine',    latitude: 33.3547, longitude: 10.5028, address: 'Rue Habib Bourguiba, 4100',                            phone: '75.640.041', fax: '75.648.748' },
  { id: 'zarzis',                 name: 'Zarzis',                 governorate: 'Médenine',    latitude: 33.5033, longitude: 11.1119, address: 'Rue des Martyrs',                                      phone: '75.684.453', fax: '75.684.950' },
  { id: 'houmt_souk',             name: 'Houmt Souk',             governorate: 'Médenine',    latitude: 33.8767, longitude: 10.8567, address: 'Place de l\'Indépendance, 4180',                       phone: '75.652.400', fax: '75.650.416' },
  { id: 'midoun',                 name: 'Midoun',                 governorate: 'Médenine',    latitude: 33.8067, longitude: 10.9817, address: 'Rue Aghir, 4116',                                      phone: '75.730.220', fax: '75.730.211' },
  { id: 'ajim',                   name: 'Ajim',                   governorate: 'Médenine',    latitude: 33.7233, longitude: 10.7517, address: 'Place Rue des Martyrs, 4135',                          phone: '75.660.001', fax: '75.660.234' },
  { id: 'ben_gardane',            name: 'Ben Gardane',            governorate: 'Médenine',    latitude: 33.1381, longitude: 11.2164, address: 'Rue 2 Mars 1934, 4160',                                phone: '75.710.005', fax: '75.710.037' },
  { id: 'beni_khedache',          name: 'Beni Khedache',          governorate: 'Médenine',    latitude: 33.0633, longitude: 10.1583, address: 'Rue Habib Bourguiba, 4110',                            phone: '75.637.050', fax: '75.637.745' },

  // ── Gafsa ──────────────────────────────────────────────────────────────────
  { id: 'gafsa',                  name: 'Gafsa',                  governorate: 'Gafsa',       latitude: 34.4250, longitude: 8.7842,  address: 'Rue El Houssine Bouzian, 2100 Gafsa',                  phone: '76.266.919', fax: '76.224.136' },
  { id: 'sened',                  name: 'Sened',                  governorate: 'Gafsa',       latitude: 34.7217, longitude: 9.3733,  address: 'Rue des Martyrs, 2190 Sened',                          phone: '76.290.164', fax: '76.290.164' },
  { id: 'redeyef',                name: 'Redeyef',                governorate: 'Gafsa',       latitude: 34.3783, longitude: 8.1583,  address: 'Rue Habib Bourguiba, Redeyef',                         phone: '76.251.026', fax: '76.251.179' },
  { id: 'oum_larayes',            name: 'Oum Larayes',            governorate: 'Gafsa',       latitude: 34.5167, longitude: 9.0000,  address: 'Cité Moderne, 2110 Oum Larayes',                       phone: '76.260.030', fax: '76.260.030' },
  { id: 'el_ksar',                name: 'El Ksar',                governorate: 'Gafsa',       latitude: 34.4267, longitude: 8.8200,  address: 'Rue des Martyrs, Gafsa La Gare 2111',                  phone: '76.273.635', fax: '76.274.590' },
  { id: 'el_guettar',             name: 'El Guettar',             governorate: 'Gafsa',       latitude: 34.3217, longitude: 8.9783,  address: 'Rue Habib Bourguiba, 2180 El Guettar',                 phone: '76.285.288', fax: '76.285.268' },
  { id: 'metlaoui',               name: 'Métlaoui',               governorate: 'Gafsa',       latitude: 34.3267, longitude: 8.4033,  address: 'Cité du Président, 2130 Métlaoui',                     phone: '76.240.075', fax: '76.240.311' },
  { id: 'mdhilla',                name: 'Mdhilla',                governorate: 'Gafsa',       latitude: 34.2467, longitude: 8.5183,  address: 'Municipalité Mdhilla 2170',                            phone: '76.266.277', fax: '76.266.583' },

  // ── Tozeur ─────────────────────────────────────────────────────────────────
  { id: 'tozeur',                 name: 'Tozeur',                 governorate: 'Tozeur',      latitude: 33.9197, longitude: 8.1335,  address: '04 Rue Abou El Kacem Chebbi, 2200 Tozeur',             phone: '76.453.055', fax: '76.453.840' },
  { id: 'nefta',                  name: 'Nefta',                  governorate: 'Tozeur',      latitude: 33.8700, longitude: 7.8767,  address: '124 Rue Habib Bourguiba, 2240 Nefta',                  phone: '76.430.606', fax: '76.421.460' },
  { id: 'degache',                name: 'Degache',                governorate: 'Tozeur',      latitude: 33.9717, longitude: 8.2050,  address: 'Rue Habib Bourguiba, 2260 Degache',                    phone: '76.420.536', fax: '76.421.922' },
  { id: 'hamma_du_jerid',         name: 'Hamma du Jérid',         governorate: 'Tozeur',      latitude: 33.8867, longitude: 8.4000,  address: '01 Rue de la Liberté, 2214 Hamma du Jérid',            phone: '76.480.272', fax: '76.480.355' },
  { id: 'tamerza',                name: 'Tamerza',                governorate: 'Tozeur',      latitude: 34.3817, longitude: 7.9300,  address: 'Rue des Martyrs, 2212 Tamerza',                        phone: '76.485.480', fax: '76.485.480' },

  // ── Tataouine ──────────────────────────────────────────────────────────────
  { id: 'tataouine',              name: 'Tataouine',              governorate: 'Tataouine',   latitude: 32.9297, longitude: 10.4517, address: 'Rue Farhat Hached, Tataouine 3200',                    phone: '75.860.002', fax: '75.860.650' },
  { id: 'ghomrassen',             name: 'Ghomrassen',             governorate: 'Tataouine',   latitude: 33.0733, longitude: 10.3183, address: 'Rue Premier Juin, Ghomrassen 3220',                    phone: '75.869.186', fax: '75.869.116' },
  { id: 'bir_lahmar',             name: 'Bir Lahmar',             governorate: 'Tataouine',   latitude: 32.7833, longitude: 10.1167, address: 'Route des Jardins, Bir Lahmar 3212',                   phone: '75.848.087', fax: '75.848.087' },
  { id: 'remada',                 name: 'Remada',                 governorate: 'Tataouine',   latitude: 32.3167, longitude: 10.3833, address: 'Place de l\'Indépendance, Remada 3240',                phone: '75.867.086', fax: '75.867.097' },
  { id: 'dhehiba',                name: 'Dhehiba',                governorate: 'Tataouine',   latitude: 32.0117, longitude: 10.3883, address: 'Rue de l\'Environnement, Dhehiba El Charkia 3253',     phone: '75.864.036', fax: '75.864.220' },

  // ── Kébili ─────────────────────────────────────────────────────────────────
  { id: 'kebili',                 name: 'Kébili',                 governorate: 'Kébili',      latitude: 33.7044, longitude: 8.9692,  address: 'Rue Habib Bourguiba, Kébili',                          phone: '75.490.011', fax: '75.490.711' },
  { id: 'douz',                   name: 'Douz',                   governorate: 'Kébili',      latitude: 33.4553, longitude: 9.0178,  address: 'Rue Habib Bourguiba, Douz',                            phone: '75.470.310', fax: '75.480.260' },
  { id: 'souk_lahad',             name: 'Souk Lahad',             governorate: 'Kébili',      latitude: 33.5333, longitude: 9.1667,  address: 'Rue El Houssine Bouzian, Souk Lahad',                  phone: '75.480.100', fax: '75.480.100' },
  { id: 'jemna',                  name: 'Jemna',                  governorate: 'Kébili',      latitude: 33.6167, longitude: 9.0333,  address: 'Rue des Martyrs',                                      phone: '75.465.280', fax: '75.465.280' },
  { id: 'el_kalaa',               name: 'El Kalaa',               governorate: 'Kébili',      latitude: 33.7833, longitude: 9.2000,  address: 'Rue 20 Mars, El Kalaa',                                phone: '75.479.269', fax: '75.479.268' },

  // ── Ariana (complément) ────────────────────────────────────────────────────
  { id: 'mnihla',                 name: 'Mnihla',                 governorate: 'Ariana',      latitude: 36.8750, longitude: 10.1833 },

  // ── Ben Arous (complément) ─────────────────────────────────────────────────
  { id: 'fouchana',               name: 'Fouchana',               governorate: 'Ben Arous',   latitude: 36.6917, longitude: 10.1600 },
  { id: 'naassan',                name: 'Naâssan',                governorate: 'Ben Arous',   latitude: 36.6483, longitude: 10.1733 },

  // ── Manouba (complément) ───────────────────────────────────────────────────
  { id: 'el_bassatine',           name: 'El Bassatine',           governorate: 'Manouba',     latitude: 36.8033, longitude: 10.0933 },

  // ── Nabeul (complément) ────────────────────────────────────────────────────
  { id: 'fondouk_jedid',          name: 'Fondouk Jedid-Soltane',  governorate: 'Nabeul',      latitude: 36.4483, longitude: 10.6233 },
  { id: 'tazghrane',              name: 'Tazghrane-Zaouiet Mkaïz',governorate: 'Nabeul',      latitude: 36.6017, longitude: 10.6983 },
  { id: 'sidi_jdidi',             name: 'Sidi Jdidi',             governorate: 'Nabeul',      latitude: 36.6783, longitude: 10.7217 },
  { id: 'bouchraie',              name: 'Bouchraïe-Echreifit',    governorate: 'Nabeul',      latitude: 36.7483, longitude: 10.7783 },

  // ── Bizerte (complément) ───────────────────────────────────────────────────
  { id: 'utique',                 name: 'Utique',                 governorate: 'Bizerte',     latitude: 37.0833, longitude: 10.0500 },
  { id: 'joumine',                name: 'Joumine',                governorate: 'Bizerte',     latitude: 37.0483, longitude: 9.3533 },
  { id: 'ghezala',                name: 'Ghezala',                governorate: 'Bizerte',     latitude: 37.1167, longitude: 9.1000 },
  { id: 'el_hachaichin',          name: 'El Hachaichin',          governorate: 'Bizerte',     latitude: 37.2217, longitude: 9.7183 },

  // ── Zaghouan (complément) ──────────────────────────────────────────────────
  { id: 'saouaf',                 name: 'Saouaf',                 governorate: 'Zaghouan',    latitude: 36.5000, longitude: 9.7483 },
  { id: 'el_amayem',              name: 'El Amayem',              governorate: 'Zaghouan',    latitude: 36.3317, longitude: 10.0483 },

  // ── Béja (complément) ──────────────────────────────────────────────────────
  { id: 'amdoun',                 name: 'Amdoun',                 governorate: 'Béja',        latitude: 36.6167, longitude: 8.8483 },
  { id: 'slouguia',               name: 'Slouguia',               governorate: 'Béja',        latitude: 36.6717, longitude: 9.0483 },
  { id: 'tibar',                  name: 'Tibar',                  governorate: 'Béja',        latitude: 36.8267, longitude: 9.1483 },
  { id: 'ouchtata_jmila',         name: 'Ouchtata-Jmila',         governorate: 'Béja',        latitude: 36.8683, longitude: 9.2183 },
  { id: 'sidi_ismail_beja',       name: 'Sidi Ismaïl',            governorate: 'Béja',        latitude: 36.7317, longitude: 9.3483 },

  // ── Jendouba (complément) ──────────────────────────────────────────────────
  { id: 'ghar_adima',             name: 'Ghar Adima',             governorate: 'Jendouba',    latitude: 36.9467, longitude: 8.9017 },
  { id: 'balta_bouaouane',        name: 'Balta Bouaouane',        governorate: 'Jendouba',    latitude: 36.7683, longitude: 8.8983 },
  { id: 'souk_essabt',            name: 'Souk Essabt',            governorate: 'Jendouba',    latitude: 36.6183, longitude: 8.6817 },
  { id: 'el_kalaa_maaden',        name: 'El Kalaa-El Maaden-Ferqousane', governorate: 'Jendouba', latitude: 36.7017, longitude: 8.6017 },
  { id: 'el_jaouaouida',          name: 'El Jaouaouida',          governorate: 'Jendouba',    latitude: 36.5517, longitude: 8.7283 },
  { id: 'ain_essabh_nadhour',     name: 'Aïn Essabh-Ennadhour',  governorate: 'Jendouba',    latitude: 36.7783, longitude: 8.7683 },
  { id: 'el_khmairia',            name: 'El Khmairia',            governorate: 'Jendouba',    latitude: 36.6483, longitude: 8.6183 },

  // ── Le Kef (complément) ────────────────────────────────────────────────────
  { id: 'menzel_chaker_kef',      name: 'Menzel Chaker',          governorate: 'Le Kef',      latitude: 36.3000, longitude: 8.9000 },
  { id: 'zaafrana_deir_kef',      name: 'Zaafrana-Deir El Kef',  governorate: 'Le Kef',      latitude: 36.2483, longitude: 8.6183 },
  { id: 'bahra',                  name: 'Bahra',                  governorate: 'Le Kef',      latitude: 36.1817, longitude: 8.7983 },
  { id: 'el_morjane',             name: 'El Morjane',             governorate: 'Le Kef',      latitude: 36.0683, longitude: 8.7683 },

  // ── Siliana (complément) ───────────────────────────────────────────────────
  { id: 'sidi_morshed',           name: 'Sidi Morshed',           governorate: 'Siliana',     latitude: 36.0183, longitude: 9.5483 },
  { id: 'el_hbabsa',              name: 'El Hbabsa',              governorate: 'Siliana',     latitude: 36.1183, longitude: 9.4683 },

  // ── Kairouan (complément) ──────────────────────────────────────────────────
  { id: 'menzel_mhiri',           name: 'Menzel El Mhiri',        governorate: 'Kairouan',    latitude: 35.4483, longitude: 10.1483 },
  { id: 'el_chibika',             name: 'El Chibika',             governorate: 'Kairouan',    latitude: 35.3783, longitude: 9.8483 },
  { id: 'siseb_edraiet',          name: 'Siseb-Edraïet',          governorate: 'Kairouan',    latitude: 35.5483, longitude: 9.8783 },
  { id: 'jhinaïna',               name: 'Jhinaïna',               governorate: 'Kairouan',    latitude: 35.6283, longitude: 9.7483 },
  { id: 'rakkada',                name: 'Rakkada',                governorate: 'Kairouan',    latitude: 35.7183, longitude: 10.0283 },
  { id: 'obeida',                 name: 'Obeïda',                 governorate: 'Kairouan',    latitude: 35.5783, longitude: 10.1183 },
  { id: 'charaitia_qsour',        name: 'Charaitia-El Qçour',     governorate: 'Kairouan',    latitude: 35.4683, longitude: 10.0483 },
  { id: 'ain_baida',              name: 'Aïn Baïda',              governorate: 'Kairouan',    latitude: 35.5183, longitude: 9.9183 },
  { id: 'chawachi',               name: 'Chawachi',               governorate: 'Kairouan',    latitude: 35.6783, longitude: 9.9183 },
  { id: 'ain_jloula',             name: 'Aïn Jloula',             governorate: 'Kairouan',    latitude: 35.4783, longitude: 10.2083 },

  // ── Kasserine (complément) ─────────────────────────────────────────────────
  { id: 'ezzouhour_kasserine',    name: 'Ezzouhour',              governorate: 'Kasserine',   latitude: 35.1683, longitude: 8.8483 },
  { id: 'el_ayoun_kasserine',     name: 'El Ayoun',               governorate: 'Kasserine',   latitude: 35.0183, longitude: 8.6683 },
  { id: 'ennour_kasserine',       name: 'Ennour',                 governorate: 'Kasserine',   latitude: 35.1017, longitude: 8.8183 },
  { id: 'hassi_el_farid',         name: 'Hassi El Farid',         governorate: 'Kasserine',   latitude: 35.0683, longitude: 8.6483 },
  { id: 'echraia_mechrek',        name: 'Echraia-Mechrek Echems', governorate: 'Kasserine',   latitude: 35.1283, longitude: 8.7683 },
  { id: 'rakhmat',                name: 'Rakhmat',                governorate: 'Kasserine',   latitude: 35.2183, longitude: 8.6483 },
  { id: 'ain_khmaïssia',          name: 'Aïn El Khmaïssia',      governorate: 'Kasserine',   latitude: 35.0583, longitude: 8.8283 },
  { id: 'khmoda',                 name: 'Khmoda',                 governorate: 'Kasserine',   latitude: 35.2483, longitude: 8.8183 },
  { id: 'bouzguem',               name: 'Bouzguem',               governorate: 'Kasserine',   latitude: 35.3283, longitude: 8.8783 },

  // ── Sidi Bouzid (complément) ───────────────────────────────────────────────
  { id: 'el_saida',               name: 'El Saïda',               governorate: 'Sidi Bouzid', latitude: 34.9983, longitude: 9.3183 },
  { id: 'souk_jedid',             name: 'Souk Jedid',             governorate: 'Sidi Bouzid', latitude: 34.7183, longitude: 9.1783 },
  { id: 'el_ahwaz_lassoueda',     name: 'El Ahwaz-Lassoueda',     governorate: 'Sidi Bouzid', latitude: 34.7783, longitude: 9.4283 },
  { id: 'benour_sb',              name: 'Benour',                 governorate: 'Sidi Bouzid', latitude: 35.1183, longitude: 9.4283 },
  { id: 'baten_el_ghazal',        name: 'Baten El Ghazal',        governorate: 'Sidi Bouzid', latitude: 34.8983, longitude: 9.3483 },
  { id: 'rahal',                  name: 'Rahal',                  governorate: 'Sidi Bouzid', latitude: 35.0483, longitude: 9.4783 },
  { id: 'el_mansoura_sb',         name: 'El Mansoura',            governorate: 'Sidi Bouzid', latitude: 34.9783, longitude: 9.2683 },

  // ── Sousse (complément) ────────────────────────────────────────────────────
  { id: 'ksibet_tharrouria',      name: 'Ksibet Sousse-Tharrouia',governorate: 'Sousse',      latitude: 35.7883, longitude: 10.6483 },
  { id: 'el_qrimat_hicher',       name: 'El Qrimat-Hicher',       governorate: 'Sousse',      latitude: 35.8783, longitude: 10.5583 },
  { id: 'chott_mariem',           name: 'Chott Mariem',           governorate: 'Sousse',      latitude: 35.9283, longitude: 10.5183 },

  // ── Mahdia (complément) ────────────────────────────────────────────────────
  { id: 'sidi_zaid_ouled',        name: 'Sidi Zaïd-Ouled Moulahem', governorate: 'Mahdia',   latitude: 35.2183, longitude: 10.8483 },
  { id: 'el_hkaima',              name: 'El Hkaïma',              governorate: 'Mahdia',      latitude: 35.1783, longitude: 10.7783 },
  { id: 'tlelsa',                 name: 'Tlelsa',                 governorate: 'Mahdia',      latitude: 35.3183, longitude: 10.9183 },
  { id: 'zalba',                  name: 'Zalba',                  governorate: 'Mahdia',      latitude: 35.2683, longitude: 10.8783 },

  // ── Sfax (complément) ──────────────────────────────────────────────────────
  { id: 'el_amra',                name: 'El Amra',                governorate: 'Sfax',        latitude: 34.7683, longitude: 10.6483 },
  { id: 'el_awabid',              name: 'El Awabid-El Khazanat',  governorate: 'Sfax',        latitude: 34.8183, longitude: 10.6983 },
  { id: 'ennadhour_sidi_ali',     name: 'Ennadhour-Sidi Ali Ben Abed', governorate: 'Sfax',   latitude: 34.7883, longitude: 10.7183 },
  { id: 'el_hajeb_sfax',          name: 'El Hajeb',               governorate: 'Sfax',        latitude: 34.6883, longitude: 10.6483 },
  { id: 'hazeg_louza',            name: 'Hazeg-El Louza',         governorate: 'Sfax',        latitude: 34.6283, longitude: 10.4683 },
  { id: 'el_achach',              name: 'El Achach',              governorate: 'Sfax',        latitude: 34.5583, longitude: 10.3583 },
  { id: 'ennaser_sfax',           name: 'Ennaser',                governorate: 'Sfax',        latitude: 34.5083, longitude: 10.2383 },

  // ── Gafsa (complément) ─────────────────────────────────────────────────────
  { id: 'el_khattar',             name: 'El Khattar',             governorate: 'Gafsa',       latitude: 34.5733, longitude: 8.6183 },
  { id: 'sidi_boubaker_gafsa',    name: 'Sidi Boubaker',          governorate: 'Gafsa',       latitude: 34.3883, longitude: 8.7283 },
  { id: 'zanouch',                name: 'Zanouch',                governorate: 'Gafsa',       latitude: 34.3283, longitude: 8.5683 },
  { id: 'belkhir',                name: 'Belkhir',                governorate: 'Gafsa',       latitude: 34.5683, longitude: 8.6183 },
  { id: 'sidi_aich_gafsa',        name: 'Sidi Aïch',             governorate: 'Gafsa',       latitude: 34.3783, longitude: 8.6783 },
  { id: 'lella',                  name: 'Lella',                  governorate: 'Gafsa',       latitude: 34.4383, longitude: 8.7983 },

  // ── Tozeur (complément) ────────────────────────────────────────────────────
  { id: 'hazwa',                  name: 'Hazwa',                  governorate: 'Tozeur',      latitude: 33.6983, longitude: 8.3483 },

  // ── Kébili (complément) ────────────────────────────────────────────────────
  { id: 'el_faouar',              name: 'El Faouar',              governorate: 'Kébili',      latitude: 33.5083, longitude: 8.8783 },
  { id: 'rejim_maatoug',          name: 'Rejim Maatoug',          governorate: 'Kébili',      latitude: 33.6983, longitude: 8.5017 },
  { id: 'bchili_jersine',         name: 'Bchili-Jarsine-Blidiate',governorate: 'Kébili',      latitude: 33.3783, longitude: 8.9183 },
  { id: 'bechri_fatnassa',        name: 'Bechri-Fatnassa',        governorate: 'Kébili',      latitude: 33.6183, longitude: 9.0483 },

  // ── Gabès (complément) ─────────────────────────────────────────────────────
  { id: 'menzel_habib_gabes',     name: 'Menzel El Habib',        governorate: 'Gabès',       latitude: 33.7283, longitude: 10.0183 },
  { id: 'bouchema',               name: 'Bouchema',               governorate: 'Gabès',       latitude: 33.7983, longitude: 9.8883 },
  { id: 'tabelbou',               name: 'Tabelbou',               governorate: 'Gabès',       latitude: 33.6483, longitude: 9.7983 },
  { id: 'el_habib_thamer',        name: 'El Habib Thamer-Bouâttouch', governorate: 'Gabès',   latitude: 33.7683, longitude: 9.9683 },
  { id: 'kettana',                name: 'Kettana',                governorate: 'Gabès',       latitude: 33.7183, longitude: 9.9283 },
  { id: 'dekhilet_toujane',       name: 'Dekhilet Toujane',       governorate: 'Gabès',       latitude: 33.6783, longitude: 9.8683 },

  // ── Médenine (complément) ──────────────────────────────────────────────────
  { id: 'sidi_makhlouf',          name: 'Sidi Makhlouf',          governorate: 'Médenine',    latitude: 33.2083, longitude: 10.9283 },
  { id: 'boughrara',              name: 'Boughrara',              governorate: 'Médenine',    latitude: 33.2683, longitude: 10.6483 },
  { id: 'zarzis_nord',            name: 'Zarzis Nord',            governorate: 'Médenine',    latitude: 33.5683, longitude: 11.1483 },

  // ── Tataouine (complément) ─────────────────────────────────────────────────
  { id: 'essamar',                name: 'Essamar',                governorate: 'Tataouine',   latitude: 32.5483, longitude: 10.1483 },
  { id: 'chenini_douiret',        name: 'Chenini-Douiret',        governorate: 'Tataouine',   latitude: 32.7783, longitude: 10.4283 },
];
