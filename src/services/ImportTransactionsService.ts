import { getCustomRepository, getRepository, In } from 'typeorm';
import csvParse from 'csv-parse';
import fs from 'fs';
import Transaction from '../models/Transaction';
import Category from '../models/Category';
import TransactionsRepository from '../repositories/TransactionsRepository';

interface CSVTransaction {
  title: string;
  type: 'income' | 'outcome';
  value: number;
  category: string;
}

class ImportTransactionsService {
  async execute(filePath: string): Promise<Transaction[]> {
    const transactionRepository = getCustomRepository(TransactionsRepository);
    const categoriesRepository = getRepository(Category);

    const concatReadStream = fs.createReadStream(filePath);

    const parses = csvParse({
      delimiter: ',',
      from_line: 2,
    });

    const parseCsv = concatReadStream.pipe(parses);

    const transactions: CSVTransaction[] = [];
    const categories: string[] = [];

    parseCsv.on('data', async line => {
      const [title, type, value, category] = line.map((cell: string) =>
        cell.trim(),
      );
      if (!title || !type || !value) return;

      categories.push(category);
      transactions.push({ title, type, value, category });
    });

    await new Promise(resolve => parseCsv.on('end', resolve));

    const existentCategories = await categoriesRepository.find({
      where: { title: In(categories) },
    });
    const existentCategoriesTitle = existentCategories.map(
      (item: Category) => item.title,
    );
    const addCategoryTitles = categories
      .filter(item => !existentCategoriesTitle.includes(item))
      .filter((value, index, self) => self.indexOf(value) === index);

    const newCategories = categoriesRepository.create(
      addCategoryTitles.map(title => ({
        title,
      })),
    );

    await categoriesRepository.save(newCategories);

    const finalCategories = [...newCategories, ...existentCategoriesTitle];

    console.log('finalCategories', finalCategories);

    const createdTransaction = transactionRepository.create(
      transactions.map(transaction => ({
        title: transaction.title,
        type: transaction.type,
        value: transaction.value,
      })),
    );
    //     category: finalCategories.find(
    //       category: Category=> category.title === transaction.category,
    // ),

    await transactionRepository.save(createdTransaction);
    await fs.promises.unlink(filePath);
    console.log(addCategoryTitles);
    console.log(categories);
    console.log(transactions);

    return createdTransaction;
  }
}

export default ImportTransactionsService;
