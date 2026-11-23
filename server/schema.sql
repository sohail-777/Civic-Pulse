CREATE DATABASE IF NOT EXISTS civic_pulse CHARACTER SET utf8mb4;
USE civic_pulse;
DROP TABLE IF EXISTS schemes; DROP TABLE IF EXISTS history;
CREATE TABLE schemes (
  id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(160) NOT NULL, category VARCHAR(40) NOT NULL,
  ministry VARCHAR(160), summary TEXT, benefits TEXT, eligibility_text TEXT, documents TEXT, apply_url VARCHAR(255),
  min_age INT NULL, max_age INT NULL, max_income INT NULL,
  gender ENUM('any','female','male') DEFAULT 'any', occupation VARCHAR(30) DEFAULT 'any'
) CHARACTER SET utf8mb4;
CREATE TABLE history (
  id INT AUTO_INCREMENT PRIMARY KEY, kind VARCHAR(20), input TEXT, language VARCHAR(20),
  output MEDIUMTEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) CHARACTER SET utf8mb4;
INSERT INTO schemes (name,category,ministry,summary,benefits,eligibility_text,documents,apply_url,min_age,max_age,max_income,gender,occupation) VALUES
('PM-KISAN','Agriculture','Ministry of Agriculture & Farmers Welfare','Income support for farmer families.','Rs 6,000 per year in three instalments, paid directly to the bank account.','Land-holding farmer families, subject to exclusion rules.','Aadhaar, land records, bank account','https://pmkisan.gov.in',18,NULL,NULL,'any','farmer'),
('Ayushman Bharat PM-JAY','Health','National Health Authority','Cashless hospital cover for eligible families.','Health cover up to Rs 5 lakh per family per year at empanelled hospitals.','Families identified through SECC data; senior citizens aged 70+ are also covered.','Aadhaar, ration card or other ID','https://pmjay.gov.in',NULL,NULL,NULL,'any','any'),
('Sukanya Samriddhi Yojana','Savings','Ministry of Finance','Small savings account for the girl child.','Higher interest rate than most savings products, with tax benefits.','Account opened in the name of a girl child below 10 years by parent or guardian.','Birth certificate, guardian ID and address proof','https://www.indiapost.gov.in',0,10,NULL,'female','any'),
('PM Mudra Yojana','Business','Ministry of Finance','Collateral-free loans for small businesses.','Loans up to Rs 20 lakh in Shishu, Kishor, Tarun and Tarun Plus categories.','Non-farm small or micro business owners and entrepreneurs.','ID, address proof, business plan or proof','https://www.mudra.org.in',18,NULL,NULL,'any','entrepreneur'),
('PM Ujjwala Yojana','Household','Ministry of Petroleum & Natural Gas','Free LPG connection for poor households.','Deposit-free LPG connection with support for the first refill and stove.','Adult women from eligible poor households without an LPG connection.','Aadhaar, ration card, bank account','https://www.pmuy.gov.in',18,NULL,NULL,'female','any'),
('Atal Pension Yojana','Pension','PFRDA','Guaranteed monthly pension for unorganised-sector workers.','Fixed pension of Rs 1,000 to Rs 5,000 per month after age 60.','Indian citizens aged 18 to 40 with a bank account.','Aadhaar, bank account, mobile number','https://npscra.nsdl.co.in',18,40,NULL,'any','worker'),
('PM Vishwakarma','Skills','Ministry of MSME','Support for traditional artisans and craftspeople.','Skill training, toolkit incentive, and collateral-free credit at low interest.','Artisans in listed traditional trades, aged 18 or above.','Aadhaar, mobile number, bank account','https://pmvishwakarma.gov.in',18,NULL,NULL,'any','artisan'),
('PM Awas Yojana (Urban)','Housing','Ministry of Housing & Urban Affairs','Housing support through interest subsidy on home loans.','Interest subsidy on home loans for EWS, LIG and MIG households.','Households without a pucca house; annual income caps apply by category (up to Rs 18 lakh).','Aadhaar, income proof, property documents','https://pmaymis.gov.in',18,NULL,1800000,'any','any'),
('Post-Matric Scholarship','Education','Ministry of Education / State departments','Scholarships for students in higher education.','Tuition fee support and maintenance allowance (varies by scheme).','Students in post-matric courses; income ceiling varies by scheme and category.','Marks sheet, income certificate, bank account','https://scholarships.gov.in',NULL,NULL,250000,'any','student');
