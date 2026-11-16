// Recorded answers for 9780802822437: Theological Dictionary of the New Testament, volume 1, edited by Gerhard Kittel, translated by Geoffrey W. Bromiley (Eerdmans, 1964).
// Asked on 16 November 2026 (the lookup problems left from 14 November); each export is
// the text exactly as the source sent it. No key is included.

export const isbn = '9780802822437';

// Open Library, /api/books?bibkeys=ISBN:<isbn>&format=json&jscmd=details
export const openLibraryDetails = "{\"ISBN:9780802822437\": {\"bib_key\": \"ISBN:9780802822437\", \"info_url\": \"http://openlibrary.org/books/OL22111101M/Theological_dictionary_of_the_New_Testament\", \"preview\": \"noview\", \"preview_url\": \"http://openlibrary.org/books/OL22111101M/Theological_dictionary_of_the_New_Testament\", \"details\": {\"publishers\": [\"Eerdmans\"], \"source_records\": [\"marc:talis_openlibrary_contribution/talis-openlibrary-contribution.mrc:1059944733:640\", \"bwb:9780802822437\"], \"title\": \"Theological dictionary of the New Testament\", \"contributions\": [\"Kittel, Gerhard.\", \"Bromiley, Geoffrey W.\"], \"identifiers\": {\"goodreads\": [\"1876082\"], \"librarything\": [\"2465170\"]}, \"languages\": [{\"key\": \"/languages/eng\"}], \"isbn_10\": [\"0802822436\"], \"publish_date\": \"1964\", \"publish_country\": \"xxk\", \"key\": \"/books/OL22111101M\", \"by_statement\": \"edited by Gerhard Kittel ; translator and editor Geoffrey W. Bromiley. Vol.1, A-G.\", \"publish_places\": [\"Grand Rapids, Mich\", \"London\"], \"works\": [{\"key\": \"/works/OL19035047W\"}], \"type\": {\"key\": \"/type/edition\"}, \"subjects\": [\"Bible. -- N.T.\"], \"latest_revision\": 5, \"revision\": 5, \"created\": {\"type\": \"/type/datetime\", \"value\": \"2008-11-07T00:36:06.566184\"}, \"last_modified\": {\"type\": \"/type/datetime\", \"value\": \"2021-12-24T23:18:16.633876\"}}}}";

// Open Library's work search by ISBN (authors and first publication)
export const openLibraryWorkSearch = "{\"numFound\":1,\"start\":0,\"numFoundExact\":true,\"num_found\":1,\"documentation_url\":\"https://openlibrary.org/dev/docs/api/search\",\"q\":\"isbn:9780802822437\",\"offset\":null,\"docs\":[{\"author_alternative_name\":[\"Geoffrey W Bromiley Ph.D.  D.Litt.\",\"Geoffrey William Bromiley\",\"G. W. Bromiley\"],\"author_key\":[\"OL1793159A\",\"OL2742980A\"],\"author_name\":[\"Gerhard Kittel\",\"Geoffrey W. Bromiley\"],\"first_publish_year\":1964,\"title\":\"Theological dictionary of the New Testament\"}]}";

// Open Library's record of the work's first author (/authors/<key>.json)
export const openLibraryAuthor = "{\"name\": \"Gerhard Kittel\", \"personal_name\": \"Gerhard Kittel\", \"last_modified\": {\"type\": \"/type/datetime\", \"value\": \"2008-08-28 09:11:31.060707\"}, \"key\": \"/authors/OL1793159A\", \"type\": {\"key\": \"/type/author\"}, \"id\": 6308458, \"revision\": 2}";

// HathiTrust's Bibliographic API, full record (null when it has none)
export const hathiTrust = null;
