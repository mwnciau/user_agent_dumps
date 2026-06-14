# Aggregate web activity dataset for user-agent behavior classification

> 600 million web access requests made to multiple servers have been collected between 2019 and 2023. The 4-year automated collection spans over 8000 domains and had iteratively been upgraded with extra data fields up until its closure in March of 2023.

This dataset of user agents has been aggregated into a single JSON file containing the normalised user agent strings and how often they appear. Due to the size of the dataset, any user agent that appears 10 or fewer times has been removed.

## Normalisation

The following normalisation has been applied to the user agent strings:

* Zero browser minor and patch version numbers, e.g. 123.45.678 -> 123.0.0
* Zero OS minor and patch version numbers, e.g. 10_15_7 -> 10_0_0
* Zero Gecko date strings, e.g. Gecko/20100101 -> Gecko/20000000

## Downloading the original data

The original data can be found at https://zenodo.org/records/14497695

The data was produced by [Lucz Geza](https://github.com/glucz), licensed under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). See also the article, [Aggregate web activity dataset for user-agent behavior classification](https://www.sciencedirect.com/science/article/pii/S2352340925000290#sec0017), published in Science Direct.
