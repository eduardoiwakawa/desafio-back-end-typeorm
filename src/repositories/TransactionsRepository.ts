/* eslint-disable no-param-reassign */
import { EntityRepository, Repository } from 'typeorm';

import Transactions from '../models/Transaction';

interface Balance {
  income: number;
  outcome: number;
  total: number;
}
@EntityRepository(Transactions)
class TransactionsRepository extends Repository<Transactions> {
  public async getBalanceAmount(): Promise<Balance> {
    const transaction = await this.find();
    const { income, outcome } = transaction.reduce(
      (acumulador: Balance, transactions) => {
        switch (transactions.type) {
          case 'income':
            acumulador.income += transactions.value;
            break;
          case 'outcome':
            acumulador.outcome += transactions.value;
            break;
          default:
            break;
        }
        return acumulador;
      },
      {
        income: 0,
        outcome: 0,
        total: 0,
      },
    );

    const total = income - outcome;

    return { income, outcome, total };
  }
}

export default TransactionsRepository;
